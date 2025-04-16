package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"
	"strconv"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/strfmt"
	mcp_golang "github.com/metoro-io/mcp-golang"
	"github.com/metoro-io/mcp-golang/transport/stdio"
	"github.com/vantage-sh/vantage-go/vantagev2/models"
	"github.com/vantage-sh/vantage-go/vantagev2/vantage/costs"
	"github.com/vantage-sh/vantage-go/vantagev2/vantage/integrations"
	meClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/me"
	tagsClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/tags"
)

type McpResponseLinks struct {
	NextPage    int32 `json:"next_page"`
	HasNextPage bool  `json:"has_next_page"`
}

var NO_NEXT_PAGE = McpResponseLinks{
	NextPage:    0,
	HasNextPage: false,
}

// Given the "next" URL from the API response, this function will return a
// McpResponseLinks object with the next page number and a boolean indicating
// whether there is a next page or not. If the URL does not contain a "page"
func buildLinksFromUrl(nextPageUrl string) McpResponseLinks {
	nextPageNumber := getPageParamFromUrl(nextPageUrl)
	if nextPageNumber == 0 {
		return NO_NEXT_PAGE
	}
	pageObj := McpResponseLinks{
		NextPage:    nextPageNumber,
		HasNextPage: true,
	}
	return pageObj
}

func getPageParamFromUrl(inputUrl string) int32 {
	parsedUrl, err := url.Parse(inputUrl)
	if err != nil {
		log.Printf("Couldn't parse the given URL %s %+v", inputUrl, err)
		return 0
	}
	params := parsedUrl.Query()
	pageParam := params.Get("page")
	if pageParam == "" {
		return 0
	}
	pageInt, err := strconv.ParseInt(pageParam, 10, 32)
	if err != nil {
		log.Printf("Couldn't convert page param to int32 %s %+v", pageParam, err)
		return 0
	}
	return int32(pageInt)
}

func setupLogger() {
	logFilename, envLookupFound := os.LookupEnv("MCP_LOG_FILE")
	if !envLookupFound {
		log.SetOutput(io.Discard)
		return
	}
	logFile, err := os.OpenFile(logFilename, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	if err != nil {
		panic(fmt.Sprintf("Failed to open log file: %+v", err))
	}
	log.SetOutput(logFile)
}

func verifyReadonlyToken(bearerToken string, authInfo runtime.ClientAuthInfoWriterFunc) {
	client := meClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
	response, err := client.GetMe(meClient.NewGetMeParams(), authInfo)
	if err != nil {
		log.Printf("Error fetching myself to verify read-only token %+v", err)
		panic(err)
	}
	payload := response.GetPayload()
	if payload == nil {
		log.Printf("Error fetching myself to verify read-only token, payload is nil")
		panic("While verifing token is read-only, Payload is nil %+V")
	}
	if !(len(payload.BearerToken.Scope) == 1 && payload.BearerToken.Scope[0] == "read") {
		panic("Bearer token is not read-only. Please provide a read-only Service Token or Personal Access Token for use with this MCP. See https://console.vantage.sh/settings/access_tokens")
	}
}

func main() {
	setupLogger()
	bearerToken, found := os.LookupEnv("VANTAGE_BEARER_TOKEN")
	if !found {
		panic("VANTAGE_BEARER_TOKEN not found, please create a read-only Service Token or Personal Access Token at https://console.vantage.sh/settings/access_tokens")
	}

	const Version = "v0.0.1alpha"

	authInfo := runtime.ClientAuthInfoWriterFunc(func(req runtime.ClientRequest, reg strfmt.Registry) error {
		if err := req.SetHeaderParam("Authorization", fmt.Sprintf("Bearer %s", bearerToken)); err != nil {
			return err
		}

		if err := req.SetHeaderParam("User-Agent", fmt.Sprintf("vantage-mcp-server/%s", Version)); err != nil {
			return err
		}

		return nil
	})
	verifyReadonlyToken(bearerToken, authInfo)
	log.Printf("Server Starting, read-only bearer token found")

	done := make(chan struct{})
	server := mcp_golang.NewServer(stdio.NewStdioServerTransport())

	// ******** Resources ********

	err := server.RegisterResource(
		"vntg://providers",
		"Cost Providers",
		"List of available cost providers",
		"application/json",
		func() (*mcp_golang.ResourceResponse, error) {
			log.Printf("invoked - resource - cost providers")
			resource := mcp_golang.NewTextEmbeddedResource(
				"vntg://providers",
				"['aws', 'azure', 'gcp']",
				"application/json",
			)

			return mcp_golang.NewResourceResponse(resource), nil
		})
	if err != nil {
		panic(err)
	}

	// ******** Tools ********

	type ListCostReportsParams struct {
		Page int32 `json:"page" jsonschema:"optional,description=page"`
	}
	type ListCostReportsResult struct {
		CostReports []*models.CostReport `json:"cost_reports"`
		PageData    McpResponseLinks     `json:"page_data"`
	}

	err = server.RegisterTool("list-cost-reports", "List all cost reports available. When you first call this function, use the `Page` parameter of 1. The 'Title' of a report is a good way to know what the report is about. The 'filter' of a report also gives clues to the data it provides.", func(params ListCostReportsParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - list cost reports %+v", params)
		client := costs.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		var limit int32 = 128

		getCostReportParams := costs.NewGetCostReportsParams()
		getCostReportParams.SetLimit(&limit)
		getCostReportParams.SetPage(&params.Page)

		apiResponse, err := client.GetCostReports(getCostReportParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("Error fetching cost reports: %+v", err)
		}

		result := ListCostReportsResult{}
		result.CostReports = apiResponse.GetPayload().CostReports
		links, ok := apiResponse.GetPayload().Links.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("Error asserting Links to map[string]interface{}")
		}
		nextPageUrl, ok := links["next"]
		if ok && nextPageUrl != nil {
			result.PageData = buildLinksFromUrl(nextPageUrl.(string))
		} else {
			result.PageData = NO_NEXT_PAGE
		}

		costReports, err := json.Marshal(result)
		if err != nil {
			return nil, fmt.Errorf("Error marshalling cost reports: %+v", err)
		}
		content := mcp_golang.NewTextContent(string(costReports))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	type ListCostIntegrations struct {
		Page int32 `json:"page" jsonschema:"optional,description=page"`
	}
	type ListCostIntegrationsResult struct {
		Integrations []*models.Integration `json:"integrations"`
		PageData     McpResponseLinks      `json:"page_data"`
	}
	err = server.RegisterTool("list-cost-integrations", "List all cost provider integrations available to provide costs data from and their associated accounts.", func(params ListCostIntegrations) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - list integrations")
		client := integrations.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		getAccountsParams := integrations.NewGetIntegrationsParams()
		getAccountsParams.SetPage(&params.Page)
		var limit int32 = 128
		getAccountsParams.SetLimit(&limit)
		apiResponse, err := client.GetIntegrations(getAccountsParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("error fetching integrations endpoint to populate accounts: %+v", err)
		}
		payload := apiResponse.GetPayload()
		results := ListCostIntegrationsResult{
			Integrations: payload.Integrations,
		}
		links, ok := apiResponse.GetPayload().Links.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("error asserting Links to map[string]interface{}")
		}
		nextPageUrl, ok := links["next"]
		if ok && nextPageUrl != nil {
			results.PageData = buildLinksFromUrl(nextPageUrl.(string))
		} else {
			results.PageData = NO_NEXT_PAGE
		}
		jsonResults, err := json.Marshal(results)
		if err != nil {
			return nil, fmt.Errorf("error marshalling json: %+v", err)
		}
		content := mcp_golang.NewTextContent(string(jsonResults))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	type ListCostsParams struct {
		Page            int32  `json:"page" jsonschema:"optional,description=page"`
		CostReportToken string `json:"cost_report_token" jsonschema:"required,description=Cost report to limit costs to"`
	}

	type ListCostsResults struct {
		Costs    []*models.Cost   `json:"cost_reports"`
		PageData McpResponseLinks `json:"page_data"`
	}

	err = server.RegisterTool("list-costs", "List the cost items inside a report. The Token of a Report must be provided. Use the page value of 1 to start.", func(params ListCostsParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - list costs %+v", params)
		client := costs.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		var limit int32 = 128

		getCostsParams := costs.NewGetCostsParams()
		getCostsParams.SetLimit(&limit)
		getCostsParams.SetCostReportToken(&params.CostReportToken)
		getCostsParams.SetPage(&params.Page)

		apiResponse, err := client.GetCosts(getCostsParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("Error fetching costs: %+v", err)
		}

		result := ListCostsResults{}
		result.Costs = apiResponse.GetPayload().Costs
		links, ok := apiResponse.GetPayload().Links.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("Error asserting Links to map[string]interface{}")
		}
		nextPageUrl, ok := links["next"]
		if ok && nextPageUrl != nil {
			result.PageData = buildLinksFromUrl(nextPageUrl.(string))
		} else {
			result.PageData = NO_NEXT_PAGE
		}

		jsonResult, err := json.Marshal(result)
		if err != nil {
			return nil, fmt.Errorf("Error marshalling costs: %+v", err)
		}

		content := mcp_golang.NewTextContent(string(jsonResult))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	type MyselfParams struct {
	}

	err = server.RegisterTool("get-myself", "Get data that is available to the current auth token", func(params MyselfParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - get myself %+v", params)
		client := meClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		getMyselfParams := meClient.NewGetMeParams()
		response, err := client.GetMe(getMyselfParams, authInfo)
		if err != nil {
			log.Printf("Error fetching myself: %+v", err)
			return nil, fmt.Errorf("Error fetching myself: %+v", err)
		}
		payload := response.GetPayload()
		myself, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("Error marshalling myself: %+v", err)
		}
		content := mcp_golang.NewTextContent(string(myself))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	type ListTagsParams struct {
		Page int32 `json:"page" jsonschema:"optional,description=page"`
	}

	// TODO(nel): can tags be exposed as a resource instead? Would need MCP clients to support pagination.
	err = server.RegisterTool("list-tags", "List tags that can be used to filter cost reports", func(params ListTagsParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - list tags %+v", params)
		client := tagsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		var limit int32 = 128

		getTagsParams := tagsClient.NewGetTagsParams()
		getTagsParams.SetLimit(&limit)
		getTagsParams.SetPage(&params.Page)

		response, err := client.GetTags(getTagsParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("Error fetching tags: %+v", err)
		}

		payload := response.GetPayload()
		tags, err := json.Marshal(payload.Tags)
		if err != nil {
			return nil, fmt.Errorf("Error marshalling tags: %+v", err)
		}
		content := mcp_golang.NewTextContent(string(tags))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	type ListTagValuesParams struct {
		Page int32  `json:"page" jsonschema:"optional,description=page"`
		Key  string `json:"key" jsonschema:"required,description=Tag key to list values for"`
	}

	err = server.RegisterTool("list-tag-values", "List tags that can be used to filter cost reports", func(params ListTagValuesParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - list tag values %+v", params)
		client := tagsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		var limit int32 = 128

		getTagValuesParams := tagsClient.NewGetTagValuesParams()
		getTagValuesParams.SetLimit(&limit)
		getTagValuesParams.SetPage(&params.Page)
		getTagValuesParams.SetKey(params.Key)

		response, err := client.GetTagValues(getTagValuesParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("Error fetching tags: %+v", err)
		}

		payload := response.GetPayload()
		tags, err := json.Marshal(payload.TagValues)
		if err != nil {
			return nil, fmt.Errorf("Error marshalling tags: %+v", err)
		}

		content := mcp_golang.NewTextContent(string(tags))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	err = server.Serve()
	if err != nil {
		panic(err)
	}

	<-done
}

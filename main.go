package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"
	goruntime "runtime"
	"strconv"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/strfmt"
	mcp_golang "github.com/metoro-io/mcp-golang"
	"github.com/metoro-io/mcp-golang/transport/stdio"
	"github.com/vantage-sh/vantage-go/vantagev2/models"
	anomaliesClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/anomaly_alerts"
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
	log.Printf("Server Starting, read-only bearer token found, OS: %s, Arch: %s", goruntime.GOOS, goruntime.GOARCH)

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

	listCostReportsDescription := `
	List all cost reports available. Cost reports are already created reports authored by a user in Vantage. If the user isn't asking about a specific report, it's better to use the query-costs tool. 
	When you first call this function, use the "Page" parameter of 1. 
	The 'Title' of a report is a good way to know what the report is about. 
	The 'filter' of a report also gives clues to the data it provides.
	The 'token' of a report is a unique identifier for the report. It can be used to generate a link to the report in the Vantage Web UI. If a user wants to see a report, you can link them like this: https://console.vantage.sh/go/<token>
	`

	err = server.RegisterTool("list-cost-reports", listCostReportsDescription, func(params ListCostReportsParams) (*mcp_golang.ToolResponse, error) {
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

	listCostIntegrationsDescription := `
	List all cost provider integrations available to provide costs data from and their associated accounts.
	Integrations are the cost providers that Vantage is configured to connect to and pull cost data from.
	If a user wants to see their providers in the Vantage Web UI, they can visit https://console.vantage.sh/settings/integrations
	`
	err = server.RegisterTool("list-cost-integrations", listCostIntegrationsDescription, func(params ListCostIntegrations) (*mcp_golang.ToolResponse, error) {
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

	type QueryCostsParams struct {
		Page           int32  `json:"page" jsonschema:"required,description=page"`
		VqlInput       string `json:"vql_input" jsonschema:"required,description=A VQL query to run against your vantage account"`
		StartDate      string `json:"start_date" jsonschema:"optional,description=Start date to filter costs by, format=YYYY-MM-DD"`
		EndDate        string `json:"end_date" jsonschema:"optional,description=End date to filter costs by, format=YYYY-MM-DD"`
		WorkspaceToken string `json:"workspace_token" jsonschema:"required,description=Workspace token to filter costs by"`
	}

	type QueryCostsResults struct {
		Costs    []*models.Cost   `json:"cost_reports"`
		PageData McpResponseLinks `json:"page_data"`
	}

	queryCostsDescription := `
	Query for costs in a Vantage Account. These are independent of a cost reports.
	Use Vantage VQL to structure a query. 
	To query for all costs from a provider, use "(cost.provider=aws)".
	You can further filter to services from a provider: "(costs.provider = 'aws' AND costs.service = 'Amazon Relational Database Service')". 
	Costs are often tagged, you can query like this: "(costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'production')"
	Queries must be scoped to a Workspace. Use the get-myself tool to know about available workspaces, and the get-cost-integrations tool to know about available cost providers. If the user didn't tell you a workspace it is best to ask them than to guess it.
	It's best to set a date range of about 30 days unless the user specifically wants to query for a longer time period.
	`

	err = server.RegisterTool("query-costs", queryCostsDescription, func(params QueryCostsParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - query costs %+v", params)
		client := costs.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		var limit int32 = 2000

		getCostsParams := costs.NewGetCostsParams()
		getCostsParams.SetFilter(&params.VqlInput)
		getCostsParams.SetWorkspaceToken(&params.WorkspaceToken)
		getCostsParams.SetStartDate(&params.StartDate)
		getCostsParams.SetEndDate(&params.EndDate)
		getCostsParams.SetPage(&params.Page)
		getCostsParams.SetLimit(&limit)

		apiResponse, err := client.GetCosts(getCostsParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("Error fetching costs: %+v", err)
		}

		result := QueryCostsResults{}
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

	type ListCostsParams struct {
		Page            int32  `json:"page" jsonschema:"optional,description=page"`
		CostReportToken string `json:"cost_report_token" jsonschema:"required,description=Cost report to limit costs to"`
	}

	type ListCostsResults struct {
		Costs    []*models.Cost   `json:"cost_reports"`
		PageData McpResponseLinks `json:"page_data"`
	}

	listCostsDescription := `
	List the cost items inside a report. The Token of a Report must be provided. Use the page value of 1 to start.
	The report token can be used to link the user to the report in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<CostReportToken>
	`

	err = server.RegisterTool("list-costs", listCostsDescription, func(params ListCostsParams) (*mcp_golang.ToolResponse, error) {
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

	getMyselfDescription := `
	Get data that is available to the current auth token. This includes the list of Workspaces they have access to.
	`

	err = server.RegisterTool("get-myself", getMyselfDescription, func(params MyselfParams) (*mcp_golang.ToolResponse, error) {
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

	type ListAnomaliesParams struct {
		Page            int32  `json:"page" jsonschema:"optional,description=page"`
		CostReportToken string `json:"cost_report_token" jsonschema:"optional,description=Cost report to filter anomalies by"`
		Service         string `json:"service" jsonschema:"optional,description=Service to filter anomalies to"`
		Provider        string `json:"provider" jsonschema:"optional,description=Provider to filter anomalies to"`
		CostCategory    string `json:"cost_category" jsonschema:"optional,description=Cost category to filter anomalies to"`
		StartDate       string `json:"start_date" jsonschema:"optional,description=Start date to filter anomalies to"`
		EndDate         string `json:"end_date" jsonschema:"optional,description=End date to filter anomalies to"`
	}

	listAnomaliesDescription := `
	Given a token of a Cost Report, look for anomalies in the report. You may optionally pass a Provider, like AWS to filter on. If you do pass a Provider, you can futher filter on a Service, like EC2 or S3.
	The report token can be used to link the user to the report in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<CostReportToken>
	`

	err = server.RegisterTool("list-anomalies", listAnomaliesDescription, func(params ListAnomaliesParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - list anomalies %+v", params)
		client := anomaliesClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		var limit int32 = 128

		getAnomaliesParams := anomaliesClient.NewGetAnomalyAlertsParams()
		getAnomaliesParams.SetLimit(&limit)
		getAnomaliesParams.SetPage(&params.Page)
		getAnomaliesParams.SetCostReportToken(&params.CostReportToken)
		getAnomaliesParams.SetService(&params.Service)
		getAnomaliesParams.SetProvider(&params.Provider)
		getAnomaliesParams.SetCostCategory(&params.CostCategory)

		// Convert string dates to strfmt.DateTime
		if params.StartDate != "" {
			startDate, err := strfmt.ParseDateTime(params.StartDate)
			if err != nil {
				return nil, fmt.Errorf("Error parsing start date: %+v", err)
			}
			getAnomaliesParams.SetStartDate(&startDate)
		}
		if params.EndDate != "" {
			endDate, err := strfmt.ParseDateTime(params.EndDate)
			if err != nil {
				return nil, fmt.Errorf("Error parsing end date: %+v", err)
			}
			getAnomaliesParams.SetEndDate(&endDate)
		}

		response, err := client.GetAnomalyAlerts(getAnomaliesParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("Error fetching anomalies: %+v", err)
		}

		payload := response.GetPayload()
		anomalies, err := json.Marshal(payload.AnomalyAlerts)
		if err != nil {
			return nil, fmt.Errorf("Error marshalling anomalies: %+v", err)
		}
		content := mcp_golang.NewTextContent(string(anomalies))
		return mcp_golang.NewToolResponse(content), nil
	})

	if err != nil {
		panic(err)
	}

	type ListTagsParams struct {
		Page int32 `json:"page" jsonschema:"optional,description=page"`
	}

	type ListTagsResult struct {
		Tags     []*models.Tag `json:"tags"`
		PageData McpResponseLinks
	}

	listTagsDescription := `
	List tags that can be used to filter costs and cost reports.
	Tags are associated with one or more Cost Providers.
	Tags can be edited in the Vantage Web UI, or have further details displayed there. Link a user to the tag page like this: https://console.vantage.sh/settings/tags?search_query=<tag>
	`

	// TODO(nel): can tags be exposed as a resource instead? Would need MCP clients to support pagination.
	err = server.RegisterTool("list-tags", listTagsDescription, func(params ListTagsParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - list tags %+v", params)
		client := tagsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		var limit int32 = 128

		getTagsParams := tagsClient.NewGetTagsParams()
		getTagsParams.SetLimit(&limit)
		getTagsParams.SetPage(&params.Page)

		apiResponse, err := client.GetTags(getTagsParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("error fetching tags: %+v", err)
		}

		payload := apiResponse.GetPayload()
		results := ListTagsResult{
			Tags: payload.Tags,
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

	type ListTagValuesParams struct {
		Page int32  `json:"page" jsonschema:"optional,description=page"`
		Key  string `json:"key" jsonschema:"required,description=Tag key to list values for"`
	}

	listTagValuesDescription := `Tags can have many values. Use this tool to find the values and service providers that are associated with a tag.`

	err = server.RegisterTool("list-tag-values", listTagValuesDescription, func(params ListTagValuesParams) (*mcp_golang.ToolResponse, error) {
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

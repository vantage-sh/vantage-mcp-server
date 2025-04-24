package main

import (
	"encoding/json"
	"flag"
	"fmt"
	userFeedbackClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/user_feedback"
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
	costProvidersClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/cost_provider"
	costServicesClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/cost_service"
	"github.com/vantage-sh/vantage-go/vantagev2/vantage/costs"
	"github.com/vantage-sh/vantage-go/vantagev2/vantage/integrations"
	meClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/me"
	tagsClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/tags"
	unitCostsClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/unit_costs"
)

const Version = "v0.0.2"

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

func checkReadonlyToken(bearerToken string, authInfo runtime.ClientAuthInfoWriterFunc) error {
	if bearerToken == "" {
		return fmt.Errorf("VANTAGE_BEARER_TOKEN not found, please create a read-only Service Token or Personal Access Token at https://console.vantage.sh/settings/access_tokens")
	}

	client := meClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
	response, err := client.GetMe(meClient.NewGetMeParams(), authInfo)

	if err != nil {
		return fmt.Errorf("Error fetching myself to verify read-only token %+v", err)
	}

	payload := response.GetPayload()
	if payload == nil {
		return fmt.Errorf("Error fetching myself to verify read-only token, payload is nil")
	}

	if !(len(payload.BearerToken.Scope) == 1 && payload.BearerToken.Scope[0] == "read") {
		return fmt.Errorf("Bearer token is not read-only. Please provide a read-only Service Token or Personal Access Token for use with this MCP. See https://console.vantage.sh/settings/access_tokens")
	}

	return nil
}

func main() {
	showVersion := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Println(Version)
		os.Exit(0)
	}

	setupLogger()

	bearerToken, _ := os.LookupEnv("VANTAGE_BEARER_TOKEN")
	authInfo := runtime.ClientAuthInfoWriterFunc(func(req runtime.ClientRequest, reg strfmt.Registry) error {
		if err := req.SetHeaderParam("Authorization", fmt.Sprintf("Bearer %s", bearerToken)); err != nil {
			return err
		}

		if err := req.SetHeaderParam("User-Agent", fmt.Sprintf("vantage-mcp-server/%s", Version)); err != nil {
			return err
		}

		return nil
	})

	bearerTokenError := checkReadonlyToken(bearerToken, authInfo)
	log.Printf("Server Starting, read-only bearer token found, OS: %s, Arch: %s", goruntime.GOOS, goruntime.GOARCH)

	done := make(chan struct{})
	server := mcp_golang.NewServer(stdio.NewStdioServerTransport())

	// ******** Resources ********

	err := server.RegisterResource(
		"vntg://version",
		"Vantage MCP Server Version",
		"Current version of the Vantage MCP server",
		"application/json",
		func() (*mcp_golang.ResourceResponse, error) {
			log.Printf("invoked - resource - version")

			resource := mcp_golang.NewTextEmbeddedResource(
				"vntg://version",
				fmt.Sprintf("\"%s\"", Version),
				"application/json",
			)

			return mcp_golang.NewResourceResponse(resource), nil
		})
	if err != nil {
		panic(err)
	}

	// ******** Tools ********

	type ListCostProvidersParams struct {
		WorkspaceToken string `json:"workspace_token" jsonschema:"required,description=Workspace token to list cost providers for"`
	}

	type ListCostProvidersResult struct {
		CostProviders []*models.CostProvider `json:"cost_providers"`
	}

	listCostProvidersDescription := `
	List of cost providers available to query for a given Workspace. Can be used to filter costs down to a specific provider in VQL queries.
	`

	err = server.RegisterTool("list-cost-providers", listCostProvidersDescription, func(params ListCostProvidersParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - list cost providers %+v", params)

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}

		client := costProvidersClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)

		getCostProvidersParams := costProvidersClient.NewGetCostProvidersParams()
		getCostProvidersParams.SetWorkspaceToken(&params.WorkspaceToken)

		apiResponse, err := client.GetCostProviders(getCostProvidersParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("Error fetching cost providers: %+v", err)
		}

		result := ListCostProvidersResult{}
		result.CostProviders = apiResponse.GetPayload().CostProviders
		costProviders, err := json.Marshal(result)
		if err != nil {
			return nil, fmt.Errorf("Error marshalling cost providers: %+v", err)
		}
		content := mcp_golang.NewTextContent(string(costProviders))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	type ListCostServicesParams struct {
		WorkspaceToken string `json:"workspace_token" jsonschema:"required,description=Workspace token to list cost services for"`
	}

	type ListCostServicesResult struct {
		CostServices []*models.CostService `json:"cost_services"`
	}

	listCostServicesDescription := `
	List of cost services available to query for a given Workspace. Can be used to filter costs down to a specific service in VQL queries.
	`

	err = server.RegisterTool("list-cost-services", listCostServicesDescription, func(params ListCostServicesParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - list cost services %+v", params)

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}

		client := costServicesClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)

		getCostServicesParams := costServicesClient.NewGetCostServicesParams()
		getCostServicesParams.SetWorkspaceToken(&params.WorkspaceToken)

		apiResponse, err := client.GetCostServices(getCostServicesParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("Error fetching cost services: %+v", err)
		}

		result := ListCostServicesResult{}
		result.CostServices = apiResponse.GetPayload().CostServices
		costServices, err := json.Marshal(result)
		if err != nil {
			return nil, fmt.Errorf("Error marshalling cost services: %+v", err)
		}
		content := mcp_golang.NewTextContent(string(costServices))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

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

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}

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

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}

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
	Queries must be scoped to a Workspace. Use the get-myself tool to know about available workspaces, and the get-cost-integrations tool to know about available cost providers. If the user didn't tell you a workspace it is best to ask them than to guess it.
	It's best to set a date range of 30 days unless the user specifically wants to query for a longer time period.

	Here is some more detailed info on using VQL:
	All costs originate from a Cost Provider (generally a cloud company like AWS, Azure, Datadog) and then filter on a service that they provide (like EC2, S3, etc).
	A cost provider is required on every VQL query.
	VQL is always in parenthesis. Always use single quotes around names that are being queried. 
	To query on a cost provider, use this syntax: (costs.provider = '<provider name>'). The provider name must come from the list-cost-providers tool.
	To query on a cost service, use this syntax: (costs.provider = '<provider name>' AND costs.service = '<service name>'). The service name must come from the list-cost-services tool.
	You can only filter against one cost provider at a time. If you want to query for costs from two providers, you need to use the OR operator. Example: ((costs.provider = 'aws') OR (costs.provider = 'azure'))
	You can otherwise use the IN system to compare against a list of items, like this: (costs.provider = 'aws' AND costs.service IN ('AWSQueueService', 'AWSLambda'))
	To filter within a cost provider, keep the cost provider part and add a AND section, example: (costs.provider = 'aws' AND costs.service = 'Amazon Relational Database Service')
	Many costs have tags on them. A tag is a "name" and one or more values.
	To find an AWS cost that has a tag of "enviornment" the value "production", use this syntax: (costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'production')
	You can also query for any value of the "environment" tag, like this: (costs.provider = 'aws' AND tags.name = 'environment')
	Items without a tag can also be filtered, example: (costs.provider = 'aws' AND tags.name = NULL)
	Parenthesis can be nested. Here we surround an OR clause to look for either of two values for a tag: (costs.provider = 'aws' AND tags.name = 'environment' AND (tags.value = 'dev' OR tags.value = 'staging'))
	A user can have more than one provider account. They can filter on provider accounts if they supply you with the account id. Example: (costs.provider = 'aws' AND costs.provider_account_id = '1000000717')
	You can also combine top-level queries to find for two providers: ((costs.provider = 'datadog') OR (costs.provider = 'azure'))
	Some cost providers operate in a specific region, you can filter using the costs.region field. Example: (costs.provider = 'aws' AND costs.region = 'us-east-1')
	`

	err = server.RegisterTool("query-costs", queryCostsDescription, func(params QueryCostsParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - query costs %+v", params)

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}

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

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}

		client := costs.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)

		// We keep this purposefully small to avoid overwhelming the LLM client with data, which can result in network errors.
		// Sadly, this has the side effect of increasing the chance the user's API token is rate-limited.
		var limit int32 = 64

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

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}

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

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}

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

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}

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

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}

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

	// ******** List unit costs tool ********

	type ListUnitCostsParams struct {
		CostReportToken string `json:"cost_report_token" jsonschema:"required,description=CostReport token to list unit costs for"`
		Page            int32  `json:"page" jsonschema:"optional,description=page number"`
		StartDate       string `json:"start_date" jsonschema:"optional,description=First date to filter unit costs from, format=YYYY-MM-DD"`
		EndDate         string `json:"end_date" jsonschema:"optional,description=Last date to filter unit costs to, format=YYYY-MM-DD"`
		DateBin         string `json:"date_bin" jsonschema:"optional,description=Date bin for unit costs (e.g., day, week, month)"`
		Order           string `json:"order" jsonschema:"optional,description=Order of results (asc or desc)"`
	}
	type ListUnitCostsResult struct {
		UnitCosts []*models.UnitCost `json:"unit_costs"`
		PageData  McpResponseLinks   `json:"page_data"`
	}
	listUnitCostsDescription := `
   Retrieve the unit costs for a given CostReport, with optional paging, date filters, and ordering.
   `
	err = server.RegisterTool("list-unit-costs", listUnitCostsDescription, func(params ListUnitCostsParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - list unit costs %+v", params)

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}
		client := unitCostsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		getParams := unitCostsClient.NewGetUnitCostsParams()
		var limit int32 = 64
		getParams.SetLimit(&limit)
		getParams.SetCostReportToken(params.CostReportToken)
		if params.Page != 0 {
			getParams.SetPage(&params.Page)
		}
		if params.StartDate != "" {
			getParams.SetStartDate(&params.StartDate)
		}
		if params.EndDate != "" {
			getParams.SetEndDate(&params.EndDate)
		}
		if params.DateBin != "" {
			getParams.SetDateBin(&params.DateBin)
		}
		if params.Order != "" {
			getParams.SetOrder(&params.Order)
		}
		apiResp, err := client.GetUnitCosts(getParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("Error fetching unit costs: %+v", err)
		}
		payload := apiResp.GetPayload()
		result := ListUnitCostsResult{
			UnitCosts: payload.UnitCosts,
		}
		links, ok := payload.Links.(map[string]interface{})
		if ok {
			if nextURL, found := links["next"]; found && nextURL != nil {
				result.PageData = buildLinksFromUrl(nextURL.(string))
			} else {
				result.PageData = NO_NEXT_PAGE
			}
		} else {
			result.PageData = NO_NEXT_PAGE
		}
		data, err := json.Marshal(result)
		if err != nil {
			return nil, fmt.Errorf("Error marshalling unit costs: %+v", err)
		}
		content := mcp_golang.NewTextContent(string(data))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	err = server.Serve()
	if err != nil {
		panic(err)
	}

	type SubmitUserFeedbackParams struct {
		Message string `json:"message" jsonschema:"required,description=Feedback message regarding using the Vantage MCP Server"`
	}

	submitFeedbackDescription := `
   Submit feedback on using the Vantage MCP Server. Ask the user if they'd like to provide feedback any time you sense they might be frustrated.
   Stop suggesting if they say they're not interested in providing feedback.
   `
	err = server.RegisterTool("submit-user-feedback", submitFeedbackDescription, func(params SubmitUserFeedbackParams) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - submit user feedback %+v", params)

		if bearerTokenError != nil {
			return nil, bearerTokenError
		}
		client := userFeedbackClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		createUserFeedbackParams := userFeedbackClient.NewCreateUserFeedbackParams()
		createUserFeedbackParams.SetCreateUserFeedback(&models.CreateUserFeedback{
			Message: &params.Message,
		})

		_, err := client.CreateUserFeedback(createUserFeedbackParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("Error submitting user feedback: %+v", err)
		}
		content := mcp_golang.NewTextContent("User feedback submitted successfully.")
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	<-done
}

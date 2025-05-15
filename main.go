package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"
	goruntime "runtime"
	"strconv"

	"github.com/go-openapi/strfmt"
	mcp_golang "github.com/metoro-io/mcp-golang"
	"github.com/metoro-io/mcp-golang/transport"
	"github.com/metoro-io/mcp-golang/transport/http"
	"github.com/metoro-io/mcp-golang/transport/stdio"
	"github.com/vantage-sh/vantage-go/vantagev2/models"
	anomaliesClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/anomaly_alerts"
	budgetsClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/budgets"
	costProvidersClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/cost_provider"
	costServicesClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/cost_service"
	costsClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/costs"
	"github.com/vantage-sh/vantage-go/vantagev2/vantage/dashboards"
	foldersClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/folders"
	"github.com/vantage-sh/vantage-go/vantagev2/vantage/integrations"
	meClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/me"
	tagsClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/tags"
	unitCostsClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/unit_costs"
	userFeedbackClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/user_feedback"
)

const Version = "v0.0.5alpha"

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

// run code that is common to all tools
func registerVantageTool[ParamType any](server *mcp_golang.Server, bearerToken BearerTokenMgr, name string, description string, givenHandler func(params ParamType) (*mcp_golang.ToolResponse, error)) {
	err := server.RegisterTool(name, description, func(params ParamType) (*mcp_golang.ToolResponse, error) {
		log.Printf("invoked - tool - %s %+v", name, params)
		if bearerToken.BearerToken == "" {
			return nil, fmt.Errorf("VANTAGE_BEARER_TOKEN not found, please create a read-only Service Token or Personal Access Token at https://console.vantage.sh/settings/access_tokens")
		}
		if bearerToken.IsReadOnly == false {
			return nil, fmt.Errorf("Bearer token is not read-only. Please provide a read-only Service Token or Personal Access Token for use with this MCP. See https://console.vantage.sh/settings/access_tokens")
		}
		return givenHandler(params)
	})
	if err != nil {
		panic(fmt.Sprintf("Failed to register tool %s: %+v", name, err))
	}
}

func main() {
	showVersion := flag.Bool("version", false, "Print version and exit")
	useHttp := flag.Bool("http", false, "Use HTTP transport")
	flag.Parse()

	if *showVersion {
		fmt.Println(Version)
		os.Exit(0)
	}

	setupLogger()

	bearerTokenMgr := NewBearerTokenMgr()

	log.Printf("Server Starting, Version: %s, OS: %s, Arch: %s", Version, goruntime.GOOS, goruntime.GOARCH)

	done := make(chan struct{})

	serverNameOption := mcp_golang.WithName("Vantage MCP Server")
	serverVersionOption := mcp_golang.WithVersion(Version)
	var transport transport.Transport
	if *useHttp {
		transport = http.NewHTTPTransport("/mcp").WithAddr(":8081")
	} else {
		transport = stdio.NewStdioServerTransport()
	}
	server := mcp_golang.NewServer(transport, serverNameOption, serverVersionOption)

	// ******** Resources ********

	err := server.RegisterResource(
		"vntg://version",
		"Vantage MCP Server Version",
		"Current version of the Vantage MCP server",
		"text/plain",
		func() (*mcp_golang.ResourceResponse, error) {
			log.Printf("invoked - resource - version")

			resource := mcp_golang.NewTextEmbeddedResource(
				"vntg://version",
				fmt.Sprintf("%s", Version),
				"text/plain",
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

	registerVantageTool(server, *bearerTokenMgr, "list-cost-providers", listCostProvidersDescription, func(params ListCostProvidersParams) (*mcp_golang.ToolResponse, error) {

		client := costProvidersClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)

		getCostProvidersParams := costProvidersClient.NewGetCostProvidersParams()
		getCostProvidersParams.SetWorkspaceToken(&params.WorkspaceToken)

		apiResponse, err := client.GetCostProviders(getCostProvidersParams, bearerTokenMgr.AuthInfo())
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

	type ListCostServicesParams struct {
		WorkspaceToken string `json:"workspace_token" jsonschema:"required,description=Workspace token to list cost services for"`
	}

	type ListCostServicesResult struct {
		CostServices []*models.CostService `json:"cost_services"`
	}

	listCostServicesDescription := `
	List of cost services available to query for a given Workspace. Can be used to filter costs down to a specific service in VQL queries.
	`

	registerVantageTool(server, *bearerTokenMgr, "list-cost-services", listCostServicesDescription, func(params ListCostServicesParams) (*mcp_golang.ToolResponse, error) {
		client := costServicesClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)

		getCostServicesParams := costServicesClient.NewGetCostServicesParams()
		getCostServicesParams.SetWorkspaceToken(&params.WorkspaceToken)

		apiResponse, err := client.GetCostServices(getCostServicesParams, bearerTokenMgr.AuthInfo())
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
	Vantage offers data related to a cost report: Forecasts. The same report token can be used on the get-cost-report-forecast tool and Vantage will forecast future costs.
	`

	registerVantageTool(server, *bearerTokenMgr, "list-cost-reports", listCostReportsDescription, func(params ListCostReportsParams) (*mcp_golang.ToolResponse, error) {

		client := costsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		var limit int32 = 128

		getCostReportParams := costsClient.NewGetCostReportsParams()
		getCostReportParams.SetLimit(&limit)
		getCostReportParams.SetPage(&params.Page)

		apiResponse, err := client.GetCostReports(getCostReportParams, bearerTokenMgr.AuthInfo())
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
	registerVantageTool(server, *bearerTokenMgr, "list-cost-integrations", listCostIntegrationsDescription, func(params ListCostIntegrations) (*mcp_golang.ToolResponse, error) {

		client := integrations.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		getAccountsParams := integrations.NewGetIntegrationsParams()
		getAccountsParams.SetPage(&params.Page)
		var limit int32 = 128
		getAccountsParams.SetLimit(&limit)
		apiResponse, err := client.GetIntegrations(getAccountsParams, bearerTokenMgr.AuthInfo())
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

	type QueryCostsParams struct {
		Page           int32  `json:"page" jsonschema:"required,description=page"`
		VqlInput       string `json:"vql_input" jsonschema:"required,description=A VQL query to run against your vantage account"`
		StartDate      string `json:"start_date" jsonschema:"optional,description=Start date to filter costs by, format=YYYY-MM-DD"`
		EndDate        string `json:"end_date" jsonschema:"optional,description=End date to filter costs by, format=YYYY-MM-DD"`
		WorkspaceToken string `json:"workspace_token" jsonschema:"required,description=Workspace token to filter costs by"`
		DateBin        string `json:"date_bin" jsonschema:"required,description=Date binning for returned costs, default to month unless user says otherwise, allowed values: day, week, month"`
	}

	type QueryCostsResults struct {
		Notes     string           `json:"notes" jsonschema:"optional,description=Notes about the results"`
		Costs     []*models.Cost   `json:"costs"`
		TotalCost interface{}      `json:"total_costs" jsonschema:"optional,description=Total costs"`
		PageData  McpResponseLinks `json:"page_data"`
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

	The DateBin parameter will let you get the information with fewer returned results.
	When DateBin=day you get a record for each service spend on that day. For DateBin=week you get one entry per week,
	with the accrued_at field set to the first day of the week, but the spend item represents spend for a full week.
	Same with DateBin=month, each record returned covers a month of data. This lets you get answers with processing fewer
	records. Only use day/week if needed, otherwise DateBin=month is preferred, and month is the value set if you pass no value for DateBin.
	`

	registerVantageTool(server, *bearerTokenMgr, "query-costs", queryCostsDescription, func(params QueryCostsParams) (*mcp_golang.ToolResponse, error) {

		client := costsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		var limit int32 = 2000

		getCostsParams := costsClient.NewGetCostsParams()
		getCostsParams.SetFilter(&params.VqlInput)
		getCostsParams.SetWorkspaceToken(&params.WorkspaceToken)
		getCostsParams.SetStartDate(&params.StartDate)
		getCostsParams.SetEndDate(&params.EndDate)
		getCostsParams.SetPage(&params.Page)
		getCostsParams.SetLimit(&limit)
		if params.DateBin != "" {
			getCostsParams.SetDateBin(&params.DateBin)
		} else {
			defaultDateBin := "month"
			getCostsParams.SetDateBin(&defaultDateBin)
		}

		apiResponse, err := client.GetCosts(getCostsParams, bearerTokenMgr.AuthInfo())
		if err != nil {
			return nil, fmt.Errorf("Error fetching costs: %+v", err)
		}

		result := QueryCostsResults{}
		result.Costs = apiResponse.GetPayload().Costs
		result.TotalCost = apiResponse.GetPayload().TotalCost
		switch *getCostsParams.DateBin {
		case "day":
			result.Notes = "Costs records represent one day."
		case "week":
			result.Notes = "Costs records represent one week, the accrued_at field is the first day of the week. If your date range is less than one week, this record includes only data for that date range, not the full week."
		default:
			result.Notes = "Costs records represent one month, the accrued_at field is the first day of the month. If your date range is less than one month, this record includes only data for that date range, not the full month."
		}

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

	type ListCostsParams struct {
		Page            int32  `json:"page" jsonschema:"optional,description=page"`
		CostReportToken string `json:"cost_report_token" jsonschema:"required,description=Cost report to limit costs to"`
		StartDate       string `json:"start_date" jsonschema:"optional,description=Start date to filter costs by, format=YYYY-MM-DD"`
		EndDate         string `json:"end_date" jsonschema:"optional,description=End date to filter costs by, format=YYYY-MM-DD"`
		DateBin         string `json:"date_bin" jsonschema:"required,description=Date binning for returned costs, default to month unless user says otherwise, allowed values: day, week, month"`
	}

	type ListCostsResults struct {
		Notes     string           `json:"notes" jsonschema:"optional,description=Notes about the results"`
		TotalCost interface{}      `json:"total_costs" jsonschema:"optional,description=Total costs"`
		Costs     []*models.Cost   `json:"costs"`
		PageData  McpResponseLinks `json:"page_data"`
	}

	listCostsDescription := `
	List the cost items inside a report. The Token of a Report must be provided. Use the page value of 1 to start.
	The report token can be used to link the user to the report in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<CostReportToken>

	The DateBin parameter will let you get the information with fewer returned results.
	When DateBin=day you get a record for each service spend on that day. For DateBin=week you get one entry per week,
	with the accrued_at field set to the first day of the week, but the spend item represents spend for a full week.
	Same with DateBin=month, each record returned covers a month of data. This lets you get answers with processing fewer
	records. Only use day/week if needed, otherwise DateBin=month is preferred, and month is the value set if you pass no value for DateBin.
	`

	registerVantageTool(server, *bearerTokenMgr, "list-costs", listCostsDescription, func(params ListCostsParams) (*mcp_golang.ToolResponse, error) {

		client := costsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)

		// We keep this purposefully small to avoid overwhelming the LLM client with data, which can result in network errors.
		// Sadly, this has the side effect of increasing the chance the user's API token is rate-limited.
		var limit int32 = 64

		getCostsParams := costsClient.NewGetCostsParams()
		getCostsParams.SetLimit(&limit)
		getCostsParams.SetCostReportToken(&params.CostReportToken)
		getCostsParams.SetPage(&params.Page)
		if params.StartDate != "" {
			getCostsParams.SetStartDate(&params.StartDate)
		}
		if params.EndDate != "" {
			getCostsParams.SetEndDate(&params.EndDate)
		}
		if params.DateBin != "" {
			getCostsParams.SetDateBin(&params.DateBin)
		} else {
			defaultDateBin := "month"
			getCostsParams.SetDateBin(&defaultDateBin)
		}

		apiResponse, err := client.GetCosts(getCostsParams, bearerTokenMgr.AuthInfo())
		if err != nil {
			return nil, fmt.Errorf("error fetching costs: %+v", err)
		}

		result := ListCostsResults{}
		result.Costs = apiResponse.GetPayload().Costs
		result.TotalCost = apiResponse.GetPayload().TotalCost
		switch *getCostsParams.DateBin {
		case "day":
			result.Notes = "Costs records represent one day."
		case "week":
			result.Notes = "Costs records represent one week, the accrued_at field is the first day of the week. If your date range is less than one week, this record includes only data for that date range, not the full week."
		default:
			result.Notes = "Costs records represent one month, the accrued_at field is the first day of the month. If your date range is less than one month, this record includes only data for that date range, not the full month."
		}
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

	// ====

	type GetCostReportForecastInput struct {
		Page            int32  `json:"page" jsonschema:"optional,description=page"`
		CostReportToken string `json:"cost_report_token" jsonschema:"required,description=Cost report to limit costs to"`
		StartDate       string `json:"start_date" jsonschema:"optional,description=Start date to filter costs by, format=YYYY-MM-DD"`
		EndDate         string `json:"end_date" jsonschema:"optional,description=End date to filter costs by, format=YYYY-MM-DD"`
		Provider        string `json:"provider" jsonschema:"optional,description=Provider to filter costs by, refer to the list-cost-providers tool"`
		Service         string `json:"service" jsonschema:"optional,description=Service to filter costs by, refer to the list-cost-services tool, must pass a provider when you pass a service"`
	}

	type GetCostReportForecastResult struct {
		ForecastedCost []*models.ForecastedCost `json:"forecasted_costs"`
		PageData       McpResponseLinks         `json:"page_data"`
		Currency       string                   `json:"currency" jsonschema:"optional,description=Currency of the forecasted costs"`
	}

	getCostReportForecastDescription := `
	Given a Cost Report Token, Vantage can forecast the costs for a given time range. Vantage will return costs that are *predicted*, but have not yet been actually incurred.
	If the user does not set a date, best to pick the next month as the default.
	The report token can be used to link the user to the report in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<CostReportToken>
	`

	registerVantageTool(server, *bearerTokenMgr, "get-cost-report-forecast", getCostReportForecastDescription, func(params GetCostReportForecastInput) (*mcp_golang.ToolResponse, error) {

		client := costsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)

		// We keep this purposefully small to avoid overwhelming the LLM client with data, which can result in network errors.
		// Sadly, this has the side effect of increasing the chance the user's API token is rate-limited.
		var limit int32 = 128

		getForecastParams := costsClient.NewGetForecastedCostsParams()
		getForecastParams.SetPage(&params.Page)
		getForecastParams.SetLimit(&limit)
		getForecastParams.SetCostReportToken(params.CostReportToken)
		if params.Provider != "" {
			getForecastParams.SetProvider(&params.Provider)
		}
		if params.Service != "" {
			getForecastParams.SetService(&params.Service)
		}
		var userStartDate strfmt.Date
		err := userStartDate.UnmarshalText([]byte(params.StartDate))
		if err == nil {
			getForecastParams.SetStartDate(&userStartDate)
		}
		var userEndDate strfmt.Date
		err = userEndDate.UnmarshalText([]byte(params.EndDate))
		if err == nil {
			getForecastParams.SetEndDate(&userEndDate)
		}

		apiResponse, err := client.GetForecastedCosts(getForecastParams, bearerTokenMgr.AuthInfo())
		if err != nil {
			return nil, fmt.Errorf("error fetching costs: %+v", err)
		}

		result := GetCostReportForecastResult{}
		result.ForecastedCost = apiResponse.GetPayload().ForecastedCosts
		result.Currency = apiResponse.GetPayload().Currency
		links, ok := apiResponse.GetPayload().Links.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("error asserting Links to map[string]interface{}")
		}
		nextPageUrl, ok := links["next"]
		if ok && nextPageUrl != nil {
			result.PageData = buildLinksFromUrl(nextPageUrl.(string))
		} else {
			result.PageData = NO_NEXT_PAGE
		}

		jsonResult, err := json.Marshal(result)
		if err != nil {
			return nil, fmt.Errorf("error marshalling costs: %+v", err)
		}

		content := mcp_golang.NewTextContent(string(jsonResult))
		return mcp_golang.NewToolResponse(content), nil
	})

	// ====

	type MyselfParams struct {
	}

	getMyselfDescription := `
	Get data that is available to the current auth token. This includes the list of Workspaces they have access to.
	`

	registerVantageTool(server, *bearerTokenMgr, "get-myself", getMyselfDescription, func(params MyselfParams) (*mcp_golang.ToolResponse, error) {

		client := meClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		getMyselfParams := meClient.NewGetMeParams()
		response, err := client.GetMe(getMyselfParams, bearerTokenMgr.AuthInfo())
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

	registerVantageTool(server, *bearerTokenMgr, "list-anomalies", listAnomaliesDescription, func(params ListAnomaliesParams) (*mcp_golang.ToolResponse, error) {

		client := anomaliesClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		var limit int32 = 128

		getAnomaliesParams := anomaliesClient.NewGetAnomalyAlertsParams()
		getAnomaliesParams.SetLimit(&limit)
		getAnomaliesParams.SetPage(&params.Page)
		getAnomaliesParams.SetCostReportToken(&params.CostReportToken)
		getAnomaliesParams.SetService(&params.Service)
		getAnomaliesParams.SetProvider(&params.Provider)
		getAnomaliesParams.SetCostCategory(&params.CostCategory)
		var startDate strfmt.DateTime
		err := startDate.UnmarshalText([]byte(params.StartDate))
		if err == nil {
			getAnomaliesParams.SetStartDate(&startDate)
		}
		var endDate strfmt.DateTime
		err = endDate.UnmarshalText([]byte(params.EndDate))
		if err == nil {
			getAnomaliesParams.SetEndDate(&endDate)
		}

		response, err := client.GetAnomalyAlerts(getAnomaliesParams, bearerTokenMgr.AuthInfo())
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
	registerVantageTool(server, *bearerTokenMgr, "list-tags", listTagsDescription, func(params ListTagsParams) (*mcp_golang.ToolResponse, error) {

		client := tagsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		var limit int32 = 128

		getTagsParams := tagsClient.NewGetTagsParams()
		getTagsParams.SetLimit(&limit)
		getTagsParams.SetPage(&params.Page)

		apiResponse, err := client.GetTags(getTagsParams, bearerTokenMgr.AuthInfo())
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

	type ListTagValuesParams struct {
		Page int32  `json:"page" jsonschema:"optional,description=page"`
		Key  string `json:"key" jsonschema:"required,description=Tag key to list values for"`
	}

	listTagValuesDescription := `Tags can have many values. Use this tool to find the values and service providers that are associated with a tag.`

	registerVantageTool(server, *bearerTokenMgr, "list-tag-values", listTagValuesDescription, func(params ListTagValuesParams) (*mcp_golang.ToolResponse, error) {

		client := tagsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		var limit int32 = 128

		getTagValuesParams := tagsClient.NewGetTagValuesParams()
		getTagValuesParams.SetLimit(&limit)
		getTagValuesParams.SetPage(&params.Page)
		getTagValuesParams.SetKey(params.Key)

		response, err := client.GetTagValues(getTagValuesParams, bearerTokenMgr.AuthInfo())
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

	// ******** List Dashboards Tool ********

	type ListDashboardsParams struct {
		Page int32 `json:"page" jsonschema:"optional,description=page number"`
	}

	type ListDashboardsResult struct {
		Dashboards []*models.Dashboard `json:"dashboards"`
		PageData   McpResponseLinks    `json:"page_data"`
	}

	listDashboardsDescription := `
	List all dashboards available in the Vantage account. Dashboards provide visualizations of cost data.
	Use the page value of 1 to start.
	The token of a dashboard can be used to link the user to the dashboard in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<token>
	`

	registerVantageTool(server, *bearerTokenMgr, "list-dashboards", listDashboardsDescription, func(params ListDashboardsParams) (*mcp_golang.ToolResponse, error) {

		client := dashboards.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		var limit int32 = 64 // Hardcoded limit

		getDashboardsParams := dashboards.NewGetDashboardsParams()
		getDashboardsParams.SetLimit(&limit)
		if params.Page != 0 {
			getDashboardsParams.SetPage(&params.Page)
		}

		apiResponse, err := client.GetDashboards(getDashboardsParams, bearerTokenMgr.AuthInfo())
		if err != nil {
			return nil, fmt.Errorf("error fetching dashboards: %+v", err)
		}

		payload := apiResponse.GetPayload()
		result := ListDashboardsResult{
			Dashboards: payload.Dashboards,
		}

		// Handle pagination links
		links, ok := payload.Links.(map[string]interface{})
		if !ok {
			log.Printf("Warning: could not assert links to map[string]interface{} for dashboards")
			result.PageData = NO_NEXT_PAGE
		} else {
			nextPageUrl, ok := links["next"]
			if ok && nextPageUrl != nil {
				result.PageData = buildLinksFromUrl(nextPageUrl.(string))
			} else {
				result.PageData = NO_NEXT_PAGE
			}
		}

		jsonResult, err := json.Marshal(result)
		if err != nil {
			return nil, fmt.Errorf("error marshalling dashboards: %+v", err)
		}

		content := mcp_golang.NewTextContent(string(jsonResult))
		return mcp_golang.NewToolResponse(content), nil
	})

	// ******** List Folders Tool ********

	type ListFoldersParams struct {
		Page int32 `json:"page" jsonschema:"optional,description=page number"`
	}

	type ListFoldersResult struct {
		Folders  []*models.Folder `json:"folders"`
		PageData McpResponseLinks `json:"page_data"`
	}

	listFoldersDescription := `
	Return all Folders for CostReports. Use the page value of 1 to start.
	`

	registerVantageTool(server, *bearerTokenMgr, "list-folders", listFoldersDescription, func(params ListFoldersParams) (*mcp_golang.ToolResponse, error) {

		client := foldersClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		var limit int32 = 128

		getFoldersParams := foldersClient.NewGetFoldersParams()
		getFoldersParams.SetLimit(&limit)
		if params.Page != 0 {
			getFoldersParams.SetPage(&params.Page)
		}

		apiResponse, err := client.GetFolders(getFoldersParams, bearerTokenMgr.AuthInfo())
		if err != nil {
			return nil, fmt.Errorf("error fetching folders: %+v", err)
		}

		payload := apiResponse.GetPayload()
		result := ListFoldersResult{
			Folders: payload.Folders,
		}

		// Handle pagination links
		links, ok := payload.Links.(map[string]interface{})
		if !ok {
			log.Printf("Warning: could not assert links to map[string]interface{} for folders")
			result.PageData = NO_NEXT_PAGE
		} else {
			nextPageUrl, ok := links["next"]
			if ok && nextPageUrl != nil {
				result.PageData = buildLinksFromUrl(nextPageUrl.(string))
			} else {
				result.PageData = NO_NEXT_PAGE
			}
		}

		jsonResult, err := json.Marshal(result)
		if err != nil {
			return nil, fmt.Errorf("error marshalling folders: %+v", err)
		}

		content := mcp_golang.NewTextContent(string(jsonResult))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	// ******** List Budgets Tool ********

	type ListBudgetsParams struct {
		Page int32 `json:"page" jsonschema:"description=page number, starts at 1"`
	}

	type ListBudgetsResult struct {
		Budgets  []*models.Budget `json:"budgets"`
		PageData McpResponseLinks `json:"page_data"`
	}

	listBudgetsDescription := `
	List all budgets available in the Vantage account. Budgets help track spending against predefined limits.
	Use the page value of 1 to start.
	A budget is built against a Cost Report. The Budget objects returned by this tool will have a "cost_report_token" field that contains the token of the Cost Report. The Cost Report has the "filter" field to know what is the range of providers & services that the budget is tracking.
	When a user is looking at a Cost Report for a specific date range, they can decide if the proivers and services spend is higher than desired by looking at the budgets for that report and the date range of the budget.
	The token of a budget can be used to link the user to the budget in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<BudgetToken>
	`

	registerVantageTool(server, *bearerTokenMgr, "list-budgets", listBudgetsDescription, func(params ListBudgetsParams) (*mcp_golang.ToolResponse, error) {

		client := budgetsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		var limit int32 = 128

		getBudgetsParams := budgetsClient.NewGetBudgetsParams()
		getBudgetsParams.SetLimit(&limit)
		if params.Page != 0 {
			getBudgetsParams.SetPage(&params.Page)
		}

		apiResponse, err := client.GetBudgets(getBudgetsParams, bearerTokenMgr.AuthInfo())
		if err != nil {
			return nil, fmt.Errorf("error fetching budgets: %+v", err)
		}

		payload := apiResponse.GetPayload()
		result := ListBudgetsResult{
			Budgets:  payload.Budgets,
			PageData: NO_NEXT_PAGE,
		}

		links, ok := payload.Links.(map[string]interface{})
		if ok {
			nextPageUrl, ok := links["next"]
			if ok && nextPageUrl != nil {
				result.PageData = buildLinksFromUrl(nextPageUrl.(string))
			}
		}

		jsonResult, err := json.Marshal(result)
		if err != nil {
			return nil, fmt.Errorf("error marshalling budgets: %+v", err)
		}

		content := mcp_golang.NewTextContent(string(jsonResult))
		return mcp_golang.NewToolResponse(content), nil
	})

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
	registerVantageTool(server, *bearerTokenMgr, "list-unit-costs", listUnitCostsDescription, func(params ListUnitCostsParams) (*mcp_golang.ToolResponse, error) {

		client := unitCostsClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
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
		apiResp, err := client.GetUnitCosts(getParams, bearerTokenMgr.AuthInfo())
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

	type SubmitUserFeedbackParams struct {
		Message string `json:"message" jsonschema:"required,description=Feedback message regarding using the Vantage MCP Server"`
	}

	submitFeedbackDescription := `
    Submit feedback on using the Vantage MCP Server. Ask the user if they'd like to provide feedback any time you sense they might be frustrated.
    Stop suggesting if they say they're not interested in providing feedback.
    `
	registerVantageTool(server, *bearerTokenMgr, "submit-user-feedback", submitFeedbackDescription, func(params SubmitUserFeedbackParams) (*mcp_golang.ToolResponse, error) {

		client := userFeedbackClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerTokenMgr.BearerToken)
		createUserFeedbackParams := userFeedbackClient.NewCreateUserFeedbackParams()
		createUserFeedbackParams.SetCreateUserFeedback(&models.CreateUserFeedback{
			Message: &params.Message,
		})

		_, err := client.CreateUserFeedback(createUserFeedbackParams, bearerTokenMgr.AuthInfo())
		if err != nil {
			return nil, fmt.Errorf("Error submitting user feedback: %+v", err)
		}
		content := mcp_golang.NewTextContent("User feedback submitted successfully.")
		return mcp_golang.NewToolResponse(content), nil
	})

	err = server.Serve()
	if err != nil {
		panic(err)
	}

	<-done
}

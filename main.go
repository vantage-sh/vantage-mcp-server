package main

import (
	"encoding/json"
	"errors"
	"fmt"
	//"log"
	"os"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/strfmt"
	mcp_golang "github.com/metoro-io/mcp-golang"
	"github.com/metoro-io/mcp-golang/transport/stdio"
	"github.com/vantage-sh/vantage-go/vantagev2/vantage/costs"
	"github.com/vantage-sh/vantage-go/vantagev2/vantage/integrations"
)

func main() {
	bearerToken, found := os.LookupEnv("VANTAGE_BEARER_TOKEN")
	if !found {
		panic("VANTAGE_BEARER_TOKEN not found")
	}
	//log.Println("Server Starting, bearer token found")

	done := make(chan struct{})
	server := mcp_golang.NewServer(stdio.NewStdioServerTransport())

	// ******** Resources ********

	err := server.RegisterResource(
		"vntg://providers",
		"Cost Providers",
		"List of available cost providers",
		"application/json",
		func() (*mcp_golang.ResourceResponse, error) {
			//log.Println("invoked - resource - cost providers")
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

	authInfo := runtime.ClientAuthInfoWriterFunc(func(req runtime.ClientRequest, reg strfmt.Registry) error {
		err := req.SetHeaderParam("Authorization", fmt.Sprintf("Bearer %s", bearerToken))
		return err
	})

	// ******** Tools ********

	type ListCostReportsParams struct {
		Page int32 `json:"page" jsonschema:"optional,description=page"`
	}

	err = server.RegisterTool("list-cost-reports", "List all cost reports available", func(params ListCostReportsParams) (*mcp_golang.ToolResponse, error) {
		//log.Println("invoked - tool - list cost reports")
		client := costs.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		var limit int32 = 10

		getCostReportParams := costs.NewGetCostReportsParams()
		getCostReportParams.SetLimit(&limit)
		getCostReportParams.SetPage(&params.Page)

		response, err := client.GetCostReports(getCostReportParams, authInfo)
		if err != nil {
			return nil, errors.New(fmt.Sprintf("Error fetching cost reports: %v", err))
		}

		payload := response.GetPayload()
		costReports, err := json.Marshal(payload.CostReports)
		if err != nil {
			return nil, errors.New(fmt.Sprintf("Error marshalling cost reports: %v", err))
		}

		content := mcp_golang.NewTextContent(string(costReports))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	type ListAccountsParams struct{}
	err = server.RegisterTool("list-cost-integrations", "List all cost provider integrations available to provide costs data from and their associated accounts.", func(params ListAccountsParams) (*mcp_golang.ToolResponse, error) {
		//log.Println("invoked - tool - list accounts")
		client := integrations.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		getAccountsParams := integrations.NewGetIntegrationsParams() // timeout is only available param
		response, err := client.GetIntegrations(getAccountsParams, authInfo)
		if err != nil {
			return nil, fmt.Errorf("error fetching integrations endpoint to populate accounts: %v", err)
		}
		payload := response.GetPayload()
		integrationsResponse, err := json.Marshal(payload.Integrations)
		if err != nil {
			return nil, fmt.Errorf("error marshalling json: %v", err)
		}
		content := mcp_golang.NewTextContent(string(integrationsResponse))
		return mcp_golang.NewToolResponse(content), nil
	})
	if err != nil {
		panic(err)
	}

	type ListCostsParams struct {
		Page            int32  `json:"page" jsonschema:"optional,description=page"`
		CostReportToken string `json:"cost_report_token" jsonschema:"required,description=Cost report to limit costs to"`
	}

	err = server.RegisterTool("list-costs", "List costs given a cost report", func(params ListCostsParams) (*mcp_golang.ToolResponse, error) {
		client := costs.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
		var limit int32 = 10

		getCostsParams := costs.NewGetCostsParams()
		getCostsParams.SetLimit(&limit)
		getCostsParams.SetCostReportToken(&params.CostReportToken)
		// TODO(nel): missing from our API?
		// getCostsParams.SetPage(&params.Page)

		response, err := client.GetCosts(getCostsParams, authInfo)
		if err != nil {
			return nil, errors.New(fmt.Sprintf("Error fetching costs: %v", err))
		}

		payload := response.GetPayload()
		groupedCosts, err := json.Marshal(payload.Costs)
		if err != nil {
			return nil, errors.New(fmt.Sprintf("Error marshalling costs: %v", err))
		}

		content := mcp_golang.NewTextContent(string(groupedCosts))
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

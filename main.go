package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/go-openapi/runtime"
	"github.com/go-openapi/strfmt"
	"github.com/metoro-io/mcp-golang"
	"github.com/metoro-io/mcp-golang/transport/stdio"
	"github.com/vantage-sh/vantage-go/vantagev2/vantage/costs"
	"os"
)

func main() {
	bearerToken, found := os.LookupEnv("VANTAGE_BEARER_TOKEN")
	if !found {
		panic("VANTAGE_BEARER_TOKEN not found")
	}

	done := make(chan struct{})
	server := mcp_golang.NewServer(stdio.NewStdioServerTransport())

	err := server.RegisterResource(
		"vntg://providers",
		"Cost Providers",
		"List of available cost providers",
		"application/json",
		func() (*mcp_golang.ResourceResponse, error) {
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

	type ListCostReportsParams struct {
		Page int32 `json:"page" jsonschema:"optional,description=page"`
	}

	err = server.RegisterTool("list-cost-reports", "List all cost reports available", func(params ListCostReportsParams) (*mcp_golang.ToolResponse, error) {
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

	err = server.Serve()
	if err != nil {
		panic(err)
	}

	<-done
}

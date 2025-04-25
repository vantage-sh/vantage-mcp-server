package main

import (
	"fmt"
	"log"
	"os"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/strfmt"
	meClient "github.com/vantage-sh/vantage-go/vantagev2/vantage/me"
)

type BearerTokenMgr struct {
	BearerToken string
	IsReadOnly  bool
	authInfo    runtime.ClientAuthInfoWriter
}

// constructor
func NewBearerTokenMgr() *BearerTokenMgr {
	b := &BearerTokenMgr{
		BearerToken: "",
		IsReadOnly:  false,
		authInfo:    nil,
	}
	bearerToken, _ := os.LookupEnv("VANTAGE_BEARER_TOKEN")
	if bearerToken == "" {
		log.Printf("VANTAGE_BEARER_TOKEN not found, please create a read-only Service Token or Personal Access Token at https://console.vantage.sh/settings/access_tokens")
		return b
	}
	b.BearerToken = bearerToken
	client := meClient.NewClientWithBearerToken("api.vantage.sh", "/v2", "https", bearerToken)
	response, err := client.GetMe(meClient.NewGetMeParams(), b.AuthInfo())
	if err != nil {
		return b
	}
	payload := response.GetPayload()
	if payload == nil {
		return b
	}

	if len(payload.BearerToken.Scope) == 1 && payload.BearerToken.Scope[0] == "read" {
		b.IsReadOnly = true
	}
	return b
}

func (b *BearerTokenMgr) AuthInfo() runtime.ClientAuthInfoWriter {
	if b.authInfo != nil {
		return b.authInfo
	}
	b.authInfo = runtime.ClientAuthInfoWriterFunc(func(req runtime.ClientRequest, reg strfmt.Registry) error {
		if err := req.SetHeaderParam("Authorization", fmt.Sprintf("Bearer %s", b.BearerToken)); err != nil {
			return err
		}

		if err := req.SetHeaderParam("User-Agent", fmt.Sprintf("vantage-mcp-server/%s", Version)); err != nil {
			return err
		}

		return nil
	})
	return b.authInfo
}

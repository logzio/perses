// Copyright 2023 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/perses/perses/internal/api/plugin"
	"github.com/perses/perses/internal/api/plugin/schema"
	"github.com/perses/perses/internal/api/validate"
	v1 "github.com/perses/perses/pkg/model/api/v1"
	"github.com/sirupsen/logrus"
)

func validateAllDashboards(sch schema.Schema) {
	logrus.Info("validate all dashboards in dev/data")
	data, err := os.ReadFile(filepath.Join("dev", "data", "9-dashboard.json"))
	if err != nil {
		logrus.Fatal(err)
	}
	var dashboardList []*v1.Dashboard
	if jsonErr := json.Unmarshal(data, &dashboardList); jsonErr != nil {
		logrus.Fatal(jsonErr)
	}
	for _, dashboard := range dashboardList {
		if vErr := validate.DashboardSpec(dashboard.Spec, sch); vErr != nil {
			logrus.Fatal(vErr)
		}
	}
}

func validateAllDatasources(sch schema.Schema) {
	logrus.Info("validate all datasources in dev/data")
	data, err := os.ReadFile(filepath.Join("dev", "data", "8-datasource.json"))
	if err != nil {
		logrus.Fatal(err)
	}
	var datasourceList []*v1.Datasource
	if jsonErr := json.Unmarshal(data, &datasourceList); jsonErr != nil {
		logrus.Fatal(jsonErr)
	}
	for _, datasource := range datasourceList {
		if vErr := validate.Datasource(datasource, nil, sch); vErr != nil {
			logrus.Fatal(vErr)
		}
	}
}

func validateAllGlobalDatasources(sch schema.Schema) {
	logrus.Info("validate all globalDatasources in dev/data")
	data, err := os.ReadFile(filepath.Join("dev", "data", "4-globaldatasource.json"))
	if err != nil {
		logrus.Fatal(err)
	}
	var datasourceList []*v1.GlobalDatasource
	if jsonErr := json.Unmarshal(data, &datasourceList); jsonErr != nil {
		logrus.Fatal(jsonErr)
	}
	for _, datasource := range datasourceList {
		if vErr := validate.Datasource(datasource, nil, sch); vErr != nil {
			logrus.Fatal(vErr)
		}
	}
}

func main() {
	sch := plugin.StrictLoad().Schema()
	validateAllDashboards(sch)
	validateAllDatasources(sch)
	validateAllGlobalDatasources(sch)
}

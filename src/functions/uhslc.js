const uhslcOverviewBody = (timeNow) => `{
    "output": "..refresh-time.children...station-table.data...station-table.columns..",
    "outputs": [
        {"id": "refresh-time", "property": "children"},
        {"id": "station-table", "property": "data"},
        {"id": "station-table", "property": "columns"}
    ],
    "inputs": [
        {"id": "refresh-time", "property": "children", "value": "${timeNow}"},
        {"id": "station-table", "property": "data", "value": []},
        {"id": "timezone-switch", "property": "value", "value": true},
        {"id": "refresh-btn", "property": "n_clicks", "value": 1}
    ],
    "changedPropIds": ["refresh-btn.n_clicks"]
}`;

const uhslcDataBody = (start, end, id) => `{
    "output":"..fig-water-level.figure@2ce52ca68ebbdac89c2bc826d04b7501...fig-batt.figure@2ce52ca68ebbdac89c2bc826d04b7501...fig-water-level.style...fig-batt.style...no-data-water-level.style...no-data-batt.style...above-plot-wl.style...legend-title-batt.style...water-level-spinner.delay_show@2ce52ca68ebbdac89c2bc826d04b7501...batt-spinner.delay_show@2ce52ca68ebbdac89c2bc826d04b7501...sensor-label.children...date-picker-range.start_date@2ce52ca68ebbdac89c2bc826d04b7501...date-picker-range.end_date@2ce52ca68ebbdac89c2bc826d04b7501..",
    "outputs":[
    {
        "id":"fig-water-level",
        "property":"figure@2ce52ca68ebbdac89c2bc826d04b7501"
    },
    {
        "id":"fig-batt",
        "property":"figure@2ce52ca68ebbdac89c2bc826d04b7501"
    },
    {
        "id":"fig-water-level",
        "property":"style"
    },
    {
        "id":"fig-batt",
        "property":"style"
    },
    {
        "id":"no-data-water-level",
        "property":"style"
    },
    {
        "id":"no-data-batt",
        "property":"style"
    },
    {
        "id":"above-plot-wl",
        "property":"style"
    },
    {
        "id":"legend-title-batt",
        "property":"style"
    },
    {
        "id":"water-level-spinner",
        "property":"delay_show@2ce52ca68ebbdac89c2bc826d04b7501"
    },
    {
        "id":"batt-spinner",
        "property":"delay_show@2ce52ca68ebbdac89c2bc826d04b7501"
    },
    {
        "id":"sensor-label",
        "property":"children"
    },
    {
        "id":"date-picker-range",
        "property":"start_date@2ce52ca68ebbdac89c2bc826d04b7501"
    },
    {
        "id":"date-picker-range",
        "property":"end_date@2ce52ca68ebbdac89c2bc826d04b7501"
    }
    ],
    "inputs":[
    {
        "id":"date-picker-range",
        "property":"start_date",
        "value":"${start}"
    },
    {
        "id":"date-picker-range",
        "property":"end_date",
        "value":"${end}"
    },
    {
        "id":"station-select",
        "property":"value",
        "value":"${id}"
    },
    {
        "id":"timezone-switch",
        "property":"value",
        "value":true
    },
    {
        "id":"refresh-btn",
        "property":"n_clicks"
    },
    {
        "id":"time-btn-30",
        "property":"n_clicks"
    },
    {
        "id":"time-btn-7",
        "property":"n_clicks"
    }
    ],
    "changedPropIds":[
    "station-select.value"
    ],
    "state":[
    {
        "id":"fig-water-level",
        "property":"figure"
    },
    {
        "id":"fig-batt",
        "property":"figure"
    },
    {
        "id":"tool-store",
        "property":"data",
        "value":{
        "dragmode":null
        }
    }
    ]
}`;

module.exports = {
    uhslcOverviewBody,
    uhslcDataBody
};
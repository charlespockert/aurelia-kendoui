import {inject, processContent, customAttribute, bindable, sync, ViewCompiler, ViewSlot, Container, ViewResources, TargetInstruction} from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import {Compiler} from '../compiler';
//import * as kendoUi from 'kendo-ui';
//import 'kendo-ui/styles/kendo.common-bootstrap.min.css!';
//import 'kendo-ui/styles/kendo.bootstrap.min.css!';

@processContent((compiler, resources, element, instruction) => {
    parseUserTemplate(element, resources, instruction);
    return true;
})
@inject(Element, Compiler, EventAggregator, TargetInstruction)
export class KendoGrid {

    element: HTMLElement;

    widget: kendo.ui.Grid;
    columns: any[] = null;

    @bindable selectable: boolean;
    @bindable filterable: boolean;
    @bindable pageable: boolean;
    @bindable sortable: boolean;
    @bindable pageSize: number = 10;
    @bindable page: number = 1;
    @bindable selectedItem: any;
    @bindable selectedItems: any[];
    @bindable autoBind: boolean = true;
    @bindable resizable: boolean = true;
    @bindable reorderable: boolean = true;
    @bindable editable: boolean;
    @bindable sort: any[];
    @bindable group: any;

    @bindable groupable: boolean = true;

    @bindable refreshFlag: any;
    @bindable read: any;

    aggregator: EventAggregator;
    compiler: Compiler;
    dataSource: kendo.data.DataSource;
    comp: any;

    constructor(element, compiler, aggregator, targetInstruction) {
        this.element = element;
        this.compiler = compiler;
        this.aggregator = aggregator;

        //kendo.culture("en-GB");

        this.columns = targetInstruction.behaviorInstructions[0].kendoGridColumns;
    }

    exportToExcel() {
        this.widget.saveAsExcel();
    }

    bind(ctx) {
        this["$parent"] = ctx;
    }

    refreshFlagChanged() {
        this.refresh();
    }

    selectedItemChanged() {
        this.widget.dataItem(this.selectedItem);
    }

    attached() {
           
        // Create the datasource
        this.dataSource = new kendoUi.data.DataSource({
            serverFiltering: true,
            serverSorting: true,
            serverPaging: true,
            group: this.group,
            page: this.page,
            pageSize: this.pageSize,
            pageable: this.pageable,
            sort: this.sort,
            schema: {
                data: "data",
                total: "total"
            },
            transport: {
                read: (options) => {

                    // Check if we have a grid read setup
                    if (!this.read) {
                        console.warn("No read method provided to Kendo Grid");
                        options.error([]);
                        return;
                    }
                    
                    // User can transform the kendo options
                    this.read(options.data)
                        .then(e => {
                            return options.success(e);
                        })
                        .catch(e => {
                            return options.error([]);
                        });
                }
            }
        });

        // Create the widget
        $(this.element).kendoGrid({
            dataSource: this.dataSource,
            columns: this.columns,
            filterable: this.filterable,
            pageable: this.pageable,
            selectable: this.selectable,
            sortable: this.sortable,
            autoBind: this.autoBind,
            resizable: this.resizable,
            reorderable: this.reorderable,
            editable: this.editable,
            groupable: this.groupable,
            excel: {

                allPages: true
            },
            // Row selection
            change: (e) => {
                var selectedRows = this.widget.select();

                var selectedItems = Array.prototype.slice.call(selectedRows).map(row => {
                    return this.widget.dataItem(row);
                });

                this.selectedItem = selectedItems[0];
                this.selectedItems = selectedItems;
            },
            dataBound: (e) => {
                // After data binding we need to find the rows and the associated 
                // data context using the row UID
                var tbody = e.sender.tbody[0];
                var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));

                rows.forEach(row => {
                    var uid = row.getAttribute("data-uid");
                    var data = e.sender.dataSource.data();
                    // Get the row...
                    var ctx = find(data, (item) => { return item.uid === uid }, this);
                    var cellctx = { $item: ctx, $parent: this["$parent"] };
                    // Replace any switched out html
                    row.innerHTML = row.innerHTML.replace(/!{/g, '${');
                    var view = this.compiler.compile(row, cellctx);
                    var viewSlot = new ViewSlot(row, false);
                    viewSlot.add(view);
                    viewSlot.attached();
                    // Remove the original row
                    row.parentNode.removeChild(row);
                    return viewSlot;
                });
            }
        });

        this.widget = $(this.element).data("kendoGrid");
    }

    refresh() {
        if (this.widget)
            this.widget.dataSource.read();
    }

    detached() {
        $(this.element).data("kendoGrid").destroy();
    }
}

function find(arr, test, ctx) {
    var result = null;
    arr.some(function (el, i) {
        return test.call(ctx, el, i, arr) ? ((result = el), true) : false;
    });
    return result;
}

function parseUserTemplate(element, resources, instruction) {
    // Pull all of the attributes off the kendo-grid-col element
    var columns = Array.prototype.slice.call(element.querySelectorAll("kendo-grid-col"));
    var colSpecs = columns.map(col => {

        var obj = {};

        for (var i = col.attributes.length - 1; i >= 0; i--) {
            var attr = col.attributes.item(i);
            obj[attr.name] = attr.value;
        }

        parseCellTemplate(col, obj);

        return obj;
    });

    // Remove any inner HTML from the element - we don't want it in the DOM
    element.innerHTML = "";

    instruction.kendoGridColumns = colSpecs;
}

function parseCellTemplate(element, spec) {
    // Hack to avoid kendo hijacking Aurelia interpolations - need a good workaround for this
    if (element.childNodes.length > 0)
        spec.template = element.innerHTML.replace(/\${/g, '!{');
}
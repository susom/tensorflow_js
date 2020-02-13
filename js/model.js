// This is the matching js file for the model display page

/*
project_id: "39"
field_name: "participant_id"
field_phi: null
form_name: "survey"
form_menu_description: "Example Survey"
field_order: "1"
field_units: null
element_preceding_header: null
element_type: "text"
element_label: "Participant ID"
element_enum: null
element_note: null
element_validation_type: null
element_validation_min: null
element_validation_max: null
element_validation_checktype: "soft_typed"
branching_logic: null
field_req: "0"
edoc_id: null
edoc_display_img: "0"
custom_alignment: null
stop_actions: null
question_num: null
grid_name: null
grid_rank: "0"
misc: null
video_url: null
video_display_inline: "0"
*/


function REDCapField(metadata) {
    this['metadata'] = metadata;
}

REDCapField.prototype.insertRow = function(container) {
    let row = $( this.getRow() );
    this.bindEvent(row);
    row.appendTo(container);
};

REDCapField.prototype.getRow = function(format) {
    //templates are injected (hidden) into the HTML and reused throughout , referenced to by #id

    // yn and tf types are just radio
    var template_suffix = this.metadata.element_type;
    if(template_suffix == "yesno" || template_suffix == "truefalse"){
        template_suffix = "radio";
    }

    var m_template_type =  "#template_" + template_suffix;
    if($(m_template_type).length){
        var m_template  = $(m_template_type).html();
        var m_nested    = $("#template_nested_top").html();

        /* radio/checkboxes/selects require extra steps to extract options which are "\\n" delimited strings and need massaging
           ... current values absurdly can be an {}, [] or String */
        var enum_result = [];
        if(this.metadata.element_enum !== null) {
            var temp = this.metadata.element_enum.split("\\n");
            for (var i in temp) {
                i           = parseInt(i);  //the # index is a "string"?  make it an int.
                var txt     = temp[i];
                var comma   = txt.indexOf(",");
                var label   = txt.substr(0, comma);
                var value   = txt.substr(comma+1);

                var checked_selected = "";
                var curval           = this.metadata.current_value;
                var hot              = false;

                if(Array.isArray(curval) || typeof(curval) == "object"){
                    //if [] or {} using the current index value will have be non null if active
                    hot = Array.isArray(curval) ? parseInt(curval[i]) : parseInt(curval[i+1]);
                }else {
                    //if string, then we have to match against label value per iteration
                    if (label == parseInt(curval)) {
                        hot = true;
                    }
                }

                if(hot){
                    checked_selected = this.metadata.element_type == "select" ? "selected" : "checked";
                }

                enum_result.push({"index": i, "key" : label, "val" : value, "selected" : checked_selected});
            }
        }
        //push a new property for multi option inputs
        this.metadata["element_enum_array"] = enum_result;

        // possible to do nested template?
        // this.metadata.nested =  renderNested(m_nested, function(data){
        //    return {element_preceding_header : data.element_preceding_header, form_menu_description : data.form_menu_description }
        // });

        return Mustache.render(m_template, this.metadata);
    }else{
        console.log("The field type [",this.metadata.element_type,"] is not supported yet");
    }
};

REDCapField.prototype.bindEvent = function(element){
    // Each created field will need to have an event binding for hijacking default behavior
    var hash = this.metadata.hash;

    element.find(":input").change(function(e){
        var input_value     = $(this).val();
        var input_field     = $(this).attr("name");

        //start spinner

        return false;
        // FIGURE OUT GRANULAR SAVE AFTER REGULAR SAVE
        // THEN PROTECTED SAVE
        $.ajax({
            method: 'POST',
            data: {
                "action": "save",
                "hash"  : hash,
                "input_value"  : input_value,
                "input_field"  : input_field
            },
            dataType: 'json'
        }).done(function(result) {
            //remove spinner
            console.log(result);

            //update all :inputs with a new record hash
        });

        e.preventDefault();
    });
    return;
}

REDCapRenderer = {
    context : {},
    pid     : "",
    event   : "",
    instance: "",
    new_record_hash : "",
    record_hash :"",
    record_id   : "",
    metadata: {},
    fields  : {},
    exclude : ["survey_complete"],

    init: function(context) {
        this.context    = context;
        this.pid        = context.pid;
        this.event      = context.event;
        this.instance   = context.instance;
        this.hash       = context.hash;
        this.getMetadata();
    },

    // todo: get metadata for a single form
    getMetadata: function(form_name) {
        $.ajax({
            context: REDCapRenderer,
            method: 'POST',
            data: {
                "action": "getMetadata",
                "hash"  : this.hash
            },
            dataType: 'json'
        }).done(function(data) {
            this.metadata = data;

            // Build the field objects and append to container
            this.buildFields();
            this.insertRows($('#redcap_container'));
            // console.log(data);
        });
    },

    buildFields: function(){
        log("Building Fields From Metadata ... ")
        for (const field_name in this.metadata) {
            if (this.exclude.indexOf(field_name) > -1){
               continue;
            }
            this.fields[field_name] = new REDCapField(this.metadata[field_name]);
            this.fields[field_name]["metadata"]["hash"] = this.hash;
        }
    },

    insertRows: function(container) {
        log("Append field html into DOM");
        for (const field in this.fields) {
            this.fields[field].insertRow(container);
        }
    },

    clearForm: function(){

    },

    saveForm: function(){

    },

    getRecordHash: function(){

    }
};
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
    let jq_row              = $( this.getRow() );
    // if(!this.metadata.readonly){
        this.bindChange(jq_row);
    // }
    jq_row.appendTo(container);
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

REDCapField.prototype.bindChange = function(element){
    // Each created input field will need to have an event binding for hijacking default behavior
    this.jq_input           = element.find(":input");
    this.og_parent_classes  = this.jq_input.closest(".bmd-form-group").attr("class"); //will do some class manipulation , so lets remember og state.
    var _this               = this;

    //HOLY CRAP, THE .change() EVENT IN MD LIBRARY HAS AN INFINITE TRIGGER BUG.  WASTED 6 hours on this BS.
    this.jq_input.blur(function(e){
        _this.updateStatus("queued");

        //set TS when starting save so we dont have run away recursion
        if(!_this.hasOwnProperty("start_save_ts")){
            _this.start_save_ts = Date.now();
        }
        var recursive_try_ts    = Date.now();
        var try_diff            = recursive_try_ts - _this.start_save_ts;

        //give it a 15 second window to keep trying
        if(try_diff < 15000){
            if(!RCForm.saveField(_this)){
                //if fail, then trigger this blur again
                setTimeout(function(){
                    _this.jq_input.blur();
                } , 1000);
            }else{
                _this.updateStatus("done");
            }
        }else{
            console.log("we give up , it hasnt saved after "+(try_diff/1000)+" seconds , try again later?");
            _this.updateStatus("failed");
            delete _this.start_save_ts;
        }

        e.preventDefault();
    });
}

REDCapField.prototype.getValue = function(){
    return this.jq_input.val();
}

REDCapField.prototype.getName = function(){
    return this.metadata.field_name;
}

REDCapField.prototype.updateStatus = function(status){
    this.jq_input.closest(".bmd-form-group").removeClass().addClass(this.og_parent_classes).addClass(status);
}
REDCapField.prototype.updateValue = function(valu){
    // this.jq_input.find(":input").val(valu);
    // this.jq_input.find("textarea").val(valu);
    // this.jq_input.closest(".bmd-form-group").addClass("is-filled");
}

RCForm = {
    //not really a requirement to preset these vars
    config      : {},
    new_hash    : "",
    record_hash : "",
    hash_flag   : false,    //this is to keep 2 simultaneous ajax calls from createing multiple new record hashes

    record_id   : "",
    metadata    : {},
    fields      : {},

    init: function(config, container) {
        this.config         = config;
        this.new_hash       = config.new_hash;
        this.exclude_fields = config.exclude_fields;
        this.readonly       = config.readonly;
        this.metadata       = config["metadata"];
        console.log("new_hash",this.new_hash);
        //if empty for some reason (it will never be empty we control the the model)
        // if($.isEmptyObject(this.metadata)) {
        //     this.getMetadata();
        // }

        // Build the field objects and append to container
        this.createForm(container);
    },

    // todo:  HANDLE ERRORS
    getMetadata: function(form_name) {
        $.ajax({
            context: RCForm,
            method: 'POST',
            data: {
                "action": "getMetadata",
                "hash"  : this.new_hash
            },
            dataType: 'json'
        }).done(function(data) {
            this.metadata = data;
        });
    },

    createForm : function(container){
        var newForm = $("<form>").addClass("container").addClass("mt-5").attr("id","redcap_form");
        container.append(newForm);

        this.buildFields();
        this.insertRows(newForm);
    },

    buildFields: function(){
        // log("Building Fields From Metadata ... ")
        for (const field_name in this.metadata) {
            if (this.exclude_fields.indexOf(field_name) > -1){
               continue;
            }
            this.fields[field_name] = new REDCapField(this.metadata[field_name]);
            this.fields[field_name]["metadata"]["hash"]     = this.new_hash;

            var readonly = this.readonly.indexOf(field_name) > -1 ? "readonly" : "";
            this.fields[field_name]["metadata"]["readonly"] = readonly;
        }
    },

    insertRows: function(container) {
        // log("Append field html into DOM");
        for (const field in this.fields) {
            this.fields[field].insertRow(container);
        }
    },

    saveField: function(field){
        //NEED AN Existing record_hash to Save To
        if(this.record_hash == "" && !this.hash_flag){
            this.hash_flag = true;

            //ajax create proper record_hash, but this should exist already ON image select maybe?
            //this is not good, possible race condition
            this.getRecordHash();
        }

        var input_value     = field.getValue();
        var input_field     = field.getName();

        $.ajax({
            method: 'POST',
            data: {
                "action"        : "saveField",
                "hash"          : this.record_hash,
                "input_value"   : input_value,
                "input_field"   : input_field
            },
            dataType: 'json'
        }).done(function(result) {
            //remove spinner
            console.log(result);
            return true;
        });
    },

    clearForm: function(){

    },

    saveForm: function(){

    },

    getRecordHash: function(_cb){
        var _this = this;
        //GET A ACTUAL RECORD HASH
        $.ajax({
            method: 'POST',
            data: {
                "action": "getRecordHash",
                "hash"  : this.new_hash,
            },
            dataType: 'json'
        }).done(function(result) {
            console.log(result);
            _this.record_hash    = result.record_hash;
            _this.participant_id = result.record_id;

            // update form to indicate new record created and ready to take values
            if(_cb && typeof(_cb) === "function"){
                _cb(_this.participant_id);

                // Only on first image load will there be a callback to this method
                // so save the model_results and base64_image in that new record
                _this.saveField(_this.fields["model_results"]);
                _this.saveField(_this.fields["base64_image"]);

                // dont mess with this read only UI
                _this.fields["participant_id"].jq_input.unbind();
                _this.fields["model_results"].jq_input.unbind();
                _this.fields["base64_image"].jq_input.unbind();
            }
        });
    }
};
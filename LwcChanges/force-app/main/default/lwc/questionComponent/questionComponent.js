import { LightningElement, api, track } from 'lwc';

export default class QuestionComponent extends LightningElement {
    @api questionData;
    @api roofingMatrial;
    checkBoxValue;
    @api checklistlabel;
    @api requirePicture;
    @track localOptions;
    uploadVariant = '';
    booleanResponse;
    booleanOptions = [
        {label:"Yes",value:"Yes"},
        {label:"No",value:"No"}
    ];
    radioValue;
    booleanResponseText;

    showBoolDetails = true;

    connectedCallback(){
        
        if(this.questionData.requirePicture){
            this.uploadVariant = 'error';
        }
        if(this.questionData.isBoolean){
            if(this.questionData.notes == 'No'){
                this.showBoolDetails = true; // Chnage FEB 5
                this.radioValue='No';
                this.booleanResponseText = '';
            }else{
                this.showBoolDetails = true;
                this.radioValue='Yes';
                this.booleanResponseText ='';
            }
        }
        if(this.questionData.isPicklist){
            //console.log('option.value >> ',this.questionData.isPicklist); 
            if(this.questionData.options && this.questionData.options.length){
                this.localOptions = JSON.parse(JSON.stringify(this.questionData.options));
                this.localOptions.forEach(option => {
                    //console.log(this.questionData.notes,'>>',option.value);
                   // console.log('this.questionData.notes >> ',this.questionData.notes);
                    if(option.value === this.questionData.notes){
                     //   console.log(this.questionData.notes===option.value);
                        option.selected = true;
                        //option.value=this.questionData.notes;
                    }else{
                        
                        option.selected = false;
                    }
                })
            }
        }

        
    }

    get showDependents(){
        if(this.questionData.dependentChecklistItems && this.questionData.dependentChecklistItems.length){
            return this.questionData.dependentChecklistItems[0].show;
        }
    }
    get IsMinimumImageComplete(){
        if(this.questionData.isImage)
        {
        if(this.questionData.minimumPhotos==0&&this.questionData.imageCount==0){
            return false;
        }
        else if(this.questionData.imageCount>=this.questionData.minimumPhotos){
            return true;
        }
    }
        if(this.questionData.isPicklist){
            if(this.questionData.notes==''||this.questionData.notes==null)
            return false;
            else if(this.questionData.notes=='-- Please Select --')
            return false;
            else
            return true;
        }
        if(this.questionData.isBoolean){
            if(this.booleanResponse=='No')
            return true; // Change feb 5
            else if(this.booleanResponse=='Yes')
            return true;
            else
            false;
            
        }
        if(this.questionData.isNumber){
            if(this.questionData.notes==''||this.questionData.notes==null)
            return false;
            else
            return true;
            
        }
    }

    handleResponse(event){
        let resp;
        let finalResp;
        if(event.target) resp = event.target.value;
       // console.log('resp >> ',resp);
       
        if(this.questionData.isPicklist)
        {
        if(resp=='No'||resp=='-- Please Select --'||resp=='None')
        this.uploadVariant=''
        else
        this.uploadVariant='error'
        }
        //console.log('this.radioValue',resp);

        if(this.questionData.isBoolean){
            if(this.booleanResponse == 'Yes'){
               
                finalResp = this.booleanResponse;
                //console.log(this.booleanResponse);
               // this.booleanResponseText = resp;
            }else{
                this.uploadVariant=''
                //console.log(this.booleanResponse);
                finalResp = this.booleanResponse;
            }
        }else{
            finalResp = resp;
        }
       // console.log(':this.checklistlabel',this.checklistlabel);
      //  console.log('this.questionData',this.questionData);
      //  console.log('finalResp',finalResp);
        this.dispatchEvent(new CustomEvent('responsedata', {
            detail: {
                "checklistlabel":this.checklistlabel,
                "questionData" : this.questionData,
                "summary":this.questionData.summary,
                "requirePicture":this.questionData.requirePicture,
                "response" : finalResp
            }
        }));
    }

    handleDependentResponse(event){
        console.log('Dep Resp >>',event.detail.response)
        if(this.questionData.isPicklist)
        {
        if(event.detail.response=='No'||event.detail.response=='-- Please Select --')
        this.uploadVariant='';
        else
        this.uploadVariant='error';
        }
        if(this.questionData.isBoolean)
        {
        if(event.detail.response=='No')
        this.uploadVariant='';
        else
        this.uploadVariant='error';
        }
        this.dispatchEvent(new CustomEvent('responsedata', {
            detail: {
                "checklistlabel":this.checklistlabel,
                "questionData" : event.detail.questionData,
                "response" : event.detail.response
            }
        }));
    }

    handleBooleanResponse(event){
        let resp = event.target.value;
       //console.log('resp >> ',resp);
        if(resp == 'Yes'){
            this.booleanResponse = 'Yes';
            this.uploadVariant='error';
            this.handleResponse(this.booleanResponse);
        }else{
            this.showBoolDetails = true;
            this.booleanResponse = 'No';
            this.uploadVariant='';
            this.handleResponse(this.booleanResponse);
        }
    }

    handleImageUpload(){
        this.dispatchEvent(new CustomEvent('imageupload', {
            detail: {
                "checklistlabel":this.checklistlabel,
                "questionData" : this.questionData,
                "sortOrder" : this.questionData.sortOrder,
                "fileName" : this.questionData.fileName,
                "imageCount": this.questionData.imageCount
            }
        }));
    }

    handleDependentImageUpload(event){
        this.dispatchEvent(new CustomEvent('imageupload', {
            detail: {
                "checklistlabel":this.checklistlabel,
                "questionData" : event.detail.questionData
            }
        }));
    }

    handleNotesEdit(){
        this.dispatchEvent(new CustomEvent('notesedit', {
            detail: {
                "checklistlabel":this.checklistlabel,
                "questionData" : this.questionData
            }
        }));
    }

    handleNotesDone(){
        this.dispatchEvent(new CustomEvent('notesdone', {
            detail: {
                "checklistlabel":this.checklistlabel,
                "questionData" : this.questionData
            }
        }));
    }
}
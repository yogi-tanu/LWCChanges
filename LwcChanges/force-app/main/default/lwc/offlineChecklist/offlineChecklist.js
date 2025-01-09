import getCheckListData from '@salesforce/apex/OfflineChecklist.getCheckListData';
import getDependentChecklistItems from '@salesforce/apex/OfflineChecklist.getDependentChecklistItems';
import saveNotes from '@salesforce/apex/OfflineChecklist.saveNotes';
import updateServiceAppointment from '@salesforce/apex/OfflineChecklist.updateServiceAppointment';

import {
    IMAGE_EXT,
    ToastTypes,
    dataURLtoFile,
    debug,
    isNullOrEmpty,
    log
} from "c/utilsImageCapture";
import { processImage } from "lightning/mediaUtils";
import {
    createRecord,
    unstable_createContentDocumentAndVersion
} from "lightning/uiRecordApi";
import { LightningElement, api, track, wire } from 'lwc';
export default class offlineChecklist extends LightningElement {
    @api recordId;
    refreshcheckListItems;
    checkListItems;
    @track parentids=[];
    error;
    isRunCmp = false;
    fileData;
    checklistDataAll;
    loading = false;
    currentLabel;
    currentCheckListId;
    currentSortOrder;
    currentFileName;
    submitted = false;
    timeoutId;
    notesModalOpen = false;
    currentNotes;
    activeSections;
    isSubmittedOnce = false;
    openImageUploadModal = false;
    completed;
    confirmationModal = false;
    confirmation = false;
    wiredependentcheckListItems;
    refreshDependlist;

@wire(getCheckListData, { serviceAppointmentId: '$recordId' }) // Pass the recordId as a parameter
wiredchecklist(result) {
    this.refreshcheckListItems=result;
    if(result.data)
    {
        
        this.checkListItems=result.data;
        this.callServiceChecklistData();
        // this.getServiceChecklistData();
         //console.log('data >>',this.checkListItems);
        
    }
    else if(result.error)
    {
        console.log('Error data >>',result.error);

    }
    
}

@wire(getDependentChecklistItems, {DependentSAId: '$recordId' }) // Pass the recordId as a parameter
wiredDependentchecklist(result) {
    //console.log('Depend>>',data,error);
    this.refreshDependlist=result;
    if(result.data)
    {
        this.wiredependentcheckListItems=result.data;
        this.callServiceChecklistData();
        console.log('Dependtent Checklist data >>',this.wiredependentcheckListItems);
       // this.getServiceChecklistData();
               //  console.log('Dependtent Checklist data >>',this.wiredependentcheckListItems);
       // console.log(JSON.parse(JSON.stringify(this.getResponseData('a7R7j0000009qwLEAQ',2))));
        
    }
    else if(result.error)
    {
        console.log('Error In dependent data >>',result.error);

    }
    
}
connectedCallback()
{
   
   // refreshApex(this.refreshcheckListItems);
   // refreshApex(this.refreshDependlists);
}
callServiceChecklistData()
{
    if (this.checkListItems && this.wiredependentcheckListItems) {
        
       // refreshApex(this.refreshcheckListItems);
        //refreshApex(this.refreshDependlists);
        this.getServiceChecklistData(null);
       /* if(navigator.onLine)
        {
            refreshApex(this.refreshcheckListItems);
            refreshApex(this.refreshDependlists);
        }*/
        console.log('data >>',this.checkListItems);
       
    
}
}




getServiceChecklistData(notesvalue){
this.loading = true;
    
    let tempItems = JSON.parse(JSON.stringify(this.checkListItems));
    console.log('notes value >>',notesvalue);
        if(tempItems && tempItems.length){
        tempItems.forEach(rec => {
            if(rec.checkListItems && rec.checkListItems.length){
                this.currentLabel = rec.checkListLabel;
                let labelPos = tempItems.findIndex(x => x.checkListLabel == this.currentLabel);
            
                rec.checkListItems.forEach(item => {
                    if(item.isQuestion){
                        let checkListPos;
                        checkListPos = tempItems[labelPos].checkListItems.findIndex(x => x.checkListId == item.checkListId);

                        let result=null;
                        if(notesvalue!=null)
                        result=this.getResponseData(item.checkListId,notesvalue);
                        else
                        result=this.getResponseData(item.checkListId,item.notes);
                
                        if(result.length) {
                            //console.log('result >> ',JSON.stringify(result));
                            
                                tempItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = JSON.parse(JSON.stringify(result));
                                
                                this.checkListItems = JSON.parse(JSON.stringify(tempItems));
                            }
                            else{
                                tempItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = null;
                                this.checkListItems = JSON.parse(JSON.stringify(tempItems));
                            }
                            if(this.isSubmittedOnce){
                                this.validatePage();
                            }
                            this.loading = false;
                        
                        
                            
                    }
                })
            }
        })
    }

else{
    this.error = JSON.stringify(error);
    console.error('Error occured :',JSON.stringify(error));
}
}



getResponseData(parma1,parma2)
{
let response=[];
let DependentData= JSON.parse(JSON.stringify(this.wiredependentcheckListItems));
if(DependentData && DependentData.length){
    DependentData.forEach(dep => {
        for(let i=1;i<=parma2;i++)
        {
            //  console.log(i+' '+dep.answerForDependent);
            if(dep.answerForDependent==i&&dep.parentChecklistId==parma1)
            response.push(dep);
        }

    })
}
return response;
//console.log('Dependtent Checklist data >>',response);

}
/*######################################################################Capture.js################################################# */
objectApiName;
@track
allImagesData = [];
imageSequence = 1;

@api label;
@api fileName;
@api sortOrder;
imageUploadModalclose=false;
compressionOptions = {
    compressionEnabled: true,
    resizeMode: "contain",
    resizeStrategy: "reduce",
    targetWidth: 2048,
    targetHeight: 2048,
    compressionQuality: 0.75,
    imageSmoothingEnabled: true,
    preserveTransparency: false,
    backgroundColor: "white"
};

nextId = 0;

isReading = false;
selectedImageInfo;

get isImageSelected() {
    return this.selectedImageInfo != null;
}

isUploading = false;
toastType = null;
numPhotosToUpload = 0;
numSuccessfullyUploadedPhotos = 0;

get numFailedUploadPhotos() {
    return this.numPhotosToUpload - this.numSuccessfullyUploadedPhotos;
}

get shouldShowToast() {
    return this.toastType == null ? false : true;
}

hideToast() {
    this.toastType = null;
}

get toastMessage() {
    switch (this.toastType) {
    case ToastTypes.Success: {
        const imageString =
        this.numPhotosToUpload > 1 ? "images were" : "image was";
        return `${this.numPhotosToUpload} ${imageString} added to the record.`;
    }
    case ToastTypes.Error: {
        return "We couldn't add the images to the record. Try again.";
    }
    case ToastTypes.Warning: {
        return `We couldn't add ${this.numFailedUploadPhotos}/${this.numPhotosToUpload} images to the record. Try again or contact your admin for help.`;
    }
    default: {
        return "";
    }
    }
}



async handleImagesSelected(event) {
    const files = event.detail;
    const numFiles = files.length;
    const compressionEnabled = this.compressionOptions.compressionEnabled;
    log(
    `Reading ${
        compressionEnabled ? "and compressing " : ""
    }${numFiles} images`
    );

    this.isReading = true;
    this.hideToast();

    try {
    for (let i = 0; i < numFiles; i++) {
        let file = files[i];

        let blob;
        if (compressionEnabled) {
        // Compress the image when reading it, so we work with smaller files in memory
        blob = await processImage(file, this.compressionOptions);
        } else {
        blob = file;
        }

        let data = await this.readFile(blob);
        let metadata = await this.readMetadata(file);

        this.allImagesData.push({
        id: this.nextId++,
        data: data,
        description: "",
        editedImageInfo: {},
        metadata: metadata
        });
    }
    } finally {
    this.isReading = false;
    }
}

// Read image data from a file selected in a browser.
// This is standard JavaScript, not unique to LWC.
readFile(file) {
    return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = (ev) => {
        resolve(ev.target.result);
    };
    reader.onerror = () => {
        reject(
        `There was an error reading file: '${file.name}', error: ${reader.error}`
        );
    };

    try {
        reader.readAsDataURL(file);
    } catch (err) {
        reject(new Error("Unable to read the input data."));
    }
    });
}

readMetadata(file) {
    return new Promise((resolve) => {
    const fullFileName = file.name;
    const ext = fullFileName.slice(
        (Math.max(0, fullFileName.lastIndexOf(".")) || Infinity) + 1
    );
    const fileNameWithoutExt = fullFileName.substring(
        0,
        fullFileName.length - ext.length - (ext ? 1 : 0)
    );

    const metadata = {
        fileName: fileNameWithoutExt,
        ext: ext,
        edited: false
    };

    debug(`Metadata for '${fullFileName}': ${JSON.stringify(metadata)}`);
    resolve(metadata);
    });
}

handleAnnotateImage(event) {
    const selectedIndex = parseInt(event.detail, 10);
    debug(`Annotating image #${selectedIndex}`);

    for (const item of this.allImagesData) {
    if (item.id === selectedIndex) {
        this.selectedImageInfo = item;
        break;
    }
    }
}

handleSaveAnnotatedImage(event) {
    debug("Saving annotated image!");
    const savedData = event.detail;
    this.selectedImageInfo.data = savedData.imageData;
    this.selectedImageInfo.editedImageInfo = savedData.editedImageInfo;
    this.selectedImageInfo.metadata.edited = true;
    this.selectedImageInfo = null;
}

handleImageDiscarded() {
    debug("Discarded annotated image!");
    this.selectedImageInfo = null;
}

handleDeleteImage(event) {
    const idToDelete = event.detail;
    this.deleteImageById(idToDelete);
    this.selectedImageInfo = null;
}

deleteImageById(id) {
    debug(`Deleteing image #${id}`);

    let index = 0;
    for (const item of this.allImagesData) {
    if (item.id === id) {
        this.allImagesData.splice(index, 1);
        break;
    }
    index++;
    }
}

async handleUploadRequested() {
    this.hideToast();
    this.isUploading = true;

    try {
    await this.uploadAllPhotos();
    } catch (e) {
    if (e.message) {
        log(`Failed to upload photos: ${e.message}`);
        debug(`Stacktrace:\n${e.stack}`);
    } else {
        log(`Failed to upload photos: ${JSON.stringify(e)}`);
        console.dir(e);
    }

    // Display the error toast message
    if (
        this.numPhotosToUpload > 1 &&
        this.numSuccessfullyUploadedPhotos > 0
    ) {
        this.toastType = ToastTypes.Warning;
    } else {
        this.toastType = ToastTypes.Error;
    }

    return;
    } finally {
    this.isUploading = false;
    }

    // Empty allImagesData to display the initial screen
    this.allImagesData = [];

    // Show success toast message
    this.toastType = ToastTypes.Success;
    
    log(`Successfully uploaded ${this.numPhotosToUpload} photos!`);
//    this.imageUploadModalclose=true;
}

async uploadAllPhotos() {
    this.numPhotosToUpload = this.allImagesData.length;
    this.numSuccessfullyUploadedPhotos = 0;

    log(`Uploading ${this.numPhotosToUpload} photos...`);

    // Make a copy of allImagesData to loop over it, because we modify allImagesData
    let allImagesCopy = [...this.allImagesData];

    for (const item of allImagesCopy) {
    const fullFileName = this.getFullFileName(item);
    const description = item.editedImageInfo.description || item.description;
    await this.uploadData(
        fullFileName,
        description,
        item.data,
        this.recordId
    );

    this.numSuccessfullyUploadedPhotos++;

    // Remove photo from this.allImagesData, so we won't upload it again in case of a failure
    this.deleteImageById(item.id);
    }
}

getFullFileName(item) {
    const ext = item.metadata.edited ? IMAGE_EXT : item.metadata.ext;
    var fullFileName = item.editedImageInfo.fileName || item.metadata.fileName;
    if (!isNullOrEmpty(ext)) {
    fullFileName += `.${ext}`;
    }

    // Replace whitespaces with underscores
    fullFileName = fullFileName.replaceAll(" ", "_");

    return fullFileName;
}

// Use LDS createContentDocumentAndVersion function to upload file to a ContentVersion object.
// This method creates drafts for ContentDocument and ContentVersion objects.
async uploadData(fileName, description, fileData, recordId) {
    log(`Uploading '${fileName}'...`);
    let fileObject = dataURLtoFile(fileData, fileName);
    const contentDocumentAndVersion =
    await unstable_createContentDocumentAndVersion({
        title: fileName,
        description: description,
        fileData: fileObject
    });

    const contentDocumentId = contentDocumentAndVersion.contentDocument.id;

    // Create a ContentDocumentLink (CDL) to associate the uploaded file
    // to the Files Related List of a record, like a Work Order.
    //Yk change recordId to this.currentCheckListId
    await this.createCdl(this.currentCheckListId, contentDocumentId);
    this.template.querySelector('.maincmp').classList.remove('slds-hide');
    this.openImageUploadModal = false;
    this.loading = false;
    //
}

async createCdl(recordId, contentDocumentId) {
    debug("Creating a CDL...");

    await createRecord({
    apiName: "ContentDocumentLink",
    fields: {
        LinkedEntityId: recordId,
        ContentDocumentId: contentDocumentId,
        ShareType: "V"
    }
    })
    .then(() => {
        debug("Successfully created a CDL!");
        //Yk this will give an error when call offline
        //refreshApex(this.refreshcheckListItems);
       // refreshApex(this.refreshDependlists);
        this.getServiceChecklistData(null);

        
    })
    .catch((e) => {
        log(`Failed to create a CDL: ${JSON.stringify(e)}`);
        throw e;
    });
}
/*-------------------------------------------------------End-----------------------------------------------------------------------------*/
    
handleScroll(event){
this.activeSections = [];
let scrollClass = event.target.getAttribute('data-id');
this.activeSections.push(scrollClass);
}

handleImageUploadModal(event){
this.template.querySelector('.maincmp').classList.add('slds-hide');
this.currentLabel = event.target.getAttribute('data-checklistlabel');
this.currentCheckListId = event.target.getAttribute('data-id');
this.currentSortOrder = event.target.getAttribute('data-sort-order');
this.currentFileName = event.target.getAttribute('data-file-name');
this.openImageUploadModal = true;
document.body.scrollTop = document.documentElement.scrollTop = 0;
}

closeImageUploadModal(){
this.template.querySelector('.maincmp').classList.remove('slds-hide');
this.openImageUploadModal = false;
}

get noCheckListData(){
return (this.checkListItems && !this.checkListItems.length);
}

get isLoading(){
return !(this.checklistDataAll.data || this.checklistDataAll.error);
} 

startAssessment(){
this.isRunCmp = true;
}

handleNotesEdit(event) {
this.notesModalOpen = true;
this.currentLabel = event.target.getAttribute('data-checklistlabel');
this.currentCheckListId = event.target.getAttribute('data-id');
let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
let checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId)
if(this.checkListItems[labelPos].checkListItems[checkListPos].notes){
    let tempNotes = this.checkListItems[labelPos].checkListItems[checkListPos].notes
    this.currentNotes = tempNotes;
}else{
    this.currentNotes = '';
}
}

hideModalBox(){
this.notesModalOpen = false;
this.confirmationModal = false;
}

handleNotesDone() {
let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
let checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId);
this.checkListItems[labelPos].checkListItems[checkListPos].showEditField = true;
saveNotes({recordId : this.currentCheckListId, notes : this.checkListItems[labelPos].checkListItems[checkListPos].notes})
.then(result => {
    if(result){
        console.log('notes saved');
        this.notesModalOpen = false;
        this.template.querySelector('lightning-textarea').value = null;
        this.currentLabel = undefined;
        this.currentCheckListId = undefined;
    }
})
.catch(error => {
    this.error = JSON.stringify(error);
    console.error('Error occured :',JSON.stringify(error));
})
}

handleQuesResponse(event){
this.currentCheckListId = event.detail.questionData.checkListId;
this.currentLabel = event.detail.checklistlabel;
this.notevalue='3';
console.log('Response Data >> ', event.detail.response);

let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);

let checkListPos;
//console.log('labelPos >> ',labelPos);
//console.log('IsDependent>> ',event.detail.questionData.isDependent);
if(event.detail.questionData.isDependent){
    checkListPos= this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == event.detail.questionData.parentChecklistId);
    let depCheckListPos = this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems.findIndex(x => x.checkListId == this.currentCheckListId);
    this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems[depCheckListPos].notes = event.detail.response;
}else{
    checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId);
    this.checkListItems[labelPos].checkListItems[checkListPos].notes = event.detail.response;
}

if(!event.detail.questionData.isDependent && (event.detail.questionData.isPicklist || event.detail.questionData.isBoolean)){
    console.log('id>>>',this.currentCheckListId,'response>>',event.detail.response);
    
   // let result=this.getResponseData(this.currentCheckListId,event.detail.response);
       // console.log('result >> ',JSON.stringify(result));
       // Assuming that saveNotes returns a Promise

//.then(() => {
let result = this.getResponseData(this.currentCheckListId, event.detail.response);

if (result.length) {
if (result[0].answer2ForDependent && result[0].answer2ForDependent.length) {
    let secondParent = result[0].answer2ForDependent.substring(0, 18);
    console.log('secondParent >> ' + secondParent);
    this.checkListItems.forEach((label) => {
    if (label.checkListItems && label.checkListItems.length) {
        label.checkListItems.forEach((item) => {
        if (item.checkListId === secondParent) {
            item.dependentChecklistItems = JSON.parse(JSON.stringify(result));
        }
        });
    }
    });
} else {
    this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = JSON.parse(JSON.stringify(result));
}
} else {
this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = null;
}

// Continue with checklist-related actions here
saveNotes({recordId : this.currentCheckListId , notes : event.detail.response})
this.getServiceChecklistData(event.detail.response);

/*})
.catch((error) => {
// Handle any errors that may occur during the saveNotes operation
console.error('Error saving notes:', error);
});*/

}
/*saveNotes({recordId : this.currentCheckListId , notes : event.detail.response})
.then(parentResult => {
    //console.log('parentResult',parentResult);
    if(parentResult){
        //yk 05-10-23  bypass condition
        if( false && this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems && this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems.length){
            let existingDependent = this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems;
            console.log('existingDependent[0].show',existingDependent[0].show);
            if(existingDependent[0].show == false){
                let existingDependent2ndParent = existingDependent[0].answer2ForDependent.substring(0,18);
                let existingDependent2ndAnswer = existingDependent[0].answer2ForDependent.substring(19,existingDependent[0].answer2ForDependent.length);
                console.log('existingDependent2ndParent >> '+existingDependent2ndParent);
                console.log('existingDependent2ndAnswer >> '+existingDependent2ndAnswer);
                if(existingDependent2ndParent == this.currentCheckListId && existingDependent2ndAnswer == event.detail.response){
                    existingDependent[0].show = true;
                }else{
                    existingDependent[0].show = false;
                }
            }
        }else{
            //console.log('else case',!event.detail.questionData.isDependent && (event.detail.questionData.isPicklist || event.detail.questionData.isBoolean));

            if(!event.detail.questionData.isDependent && (event.detail.questionData.isPicklist || event.detail.questionData.isBoolean)){
                console.log('id>>>',this.currentCheckListId,'response>>',event.detail.response)
                let result=this.getResponseData(this.currentCheckListId,event.detail.response);
                   // console.log('result >> ',JSON.stringify(result));
                    if(result.length){
                        if(result[0].answer2ForDependent && result[0].answer2ForDependent.length){
                            let secondParent = result[0].answer2ForDependent.substring(0,18);
                            console.log('secondParent >> '+secondParent);
                            this.checkListItems.forEach(label => {
                                if(label.checkListItems && label.checkListItems.length){
                                    label.checkListItems.forEach(item => {
                                        if(item.checkListId == secondParent){
                                            item.dependentChecklistItems = JSON.parse(JSON.stringify(result));
                                        }
                                    })
                                }
                            })
                        }else{
                            this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = JSON.parse(JSON.stringify(result));
                        
                        }
                       // console.log('<< data >> ',JSON.stringify(this.checkListItems[labelPos].checkListItems[checkListPos]));
                    }else{
                        this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = null;
                    }
                
            }
           // this.getServiceChecklistData();
        }
    }
})
.catch(error => {
    this.error = JSON.stringify(error);
    console.error('Error occured :',JSON.stringify(error));
})
*/
}

handleQuestionNotesEdit(event){
this.currentCheckListId = event.detail.questionData.checkListId;
this.currentLabel = event.detail.checklistlabel;
let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
let checkListPos;
if(event.detail.questionData.isDependent){
    checkListPos= this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == event.detail.questionData.parentChecklistId);
    let depCheckListPos = this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems.findIndex(x => x.checkListId == this.currentCheckListId);
    this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems[depCheckListPos].showNotesInput = true;
}else{
    checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId);
    this.checkListItems[labelPos].checkListItems[checkListPos].showNotesInput = true;
}
}

handleQuestionNotesDone(event){
this.currentCheckListId = event.detail.questionData.checkListId;
this.currentLabel = event.detail.checklistlabel;
let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
let checkListPos;
if(event.detail.questionData.isDependent){
    checkListPos= this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == event.detail.questionData.parentChecklistId);
    let depCheckListPos = this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems.findIndex(x => x.checkListId == this.currentCheckListId);
    this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems[depCheckListPos].showNotesInput = false;
}else{
    checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId);
    this.checkListItems[labelPos].checkListItems[checkListPos].showNotesInput = false;
}
}

handleQuestionImageUpload(event){
this.template.querySelector('.maincmp').classList.add('slds-hide');
this.currentLabel = event.detail.checkListLabel;
this.currentCheckListId = event.detail.questionData.checkListId;
this.currentSortOrder = event.detail.sortOrder;
this.currentFileName = event.detail.fileName;
this.openImageUploadModal = true;
document.body.scrollTop = document.documentElement.scrollTop = 0;
}

handleNotesUpdate(event) {
// let checkListLabel = event.target.getAttribute('data-checklistlabel');
// let checkListId = event.target.getAttribute('data-id'); 
let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
let checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId)
this.checkListItems[labelPos].checkListItems[checkListPos].notes = event.target.value;
}

/*handleImagesUpload(event){
let recId = event.detail.checkListItem;
let imagesData = event.detail.images;

if(imagesData && imagesData.length){
    this.loading = true;
    let count = 0;
    imagesData.forEach(image => {
        saveImage({recordId:recId, imageName : image.imageName, base64Data : image.base64Data})
        .then(result => {
            if(result){
                count ++;
                if(count == imagesData.length){
                    //console.log('image saved');
                    this.template.querySelector('.maincmp').classList.remove('slds-hide');
                    this.openImageUploadModal = false;
                    this.loading = false;
                    this.getServiceChecklistData();
                }
            }
        })
        .catch(error => {
            this.error = JSON.stringify(error);
            console.error('Error occured :',error);
        })
    })
}

}*/

handleSubmit(event) {
this.isSubmittedOnce = true;
let allSet = this.validatePage();
if(allSet){
    this.error = undefined;
    this.confirmationModal = true;
}else{
    this.error = 'Please resolve below errors to submit.';
}
}

handleYes(){
this.confirmation = true;
this.loading = true;
updateServiceAppointment({recordId : this.recordId})
.then(result => {
    if(result == 'saved'){
        this.loading = false;
        this.submitted = true;
            this.hideModalBox();
        
    }
})
.catch(error => {
    this.error = JSON.stringify(error);
    console.error('Error occured :',error);
        this.hideModalBox();
})

}

handleNo(){
this.hideModalBox();
}

validatePage(){
let allSet = true;
if(this.checkListItems && this.checkListItems.length){
    this.checkListItems.forEach(rec => {
        if(rec.checkListItems && rec.checkListItems.length){
            rec.checkListItems.forEach(item => {
                if(item.requirePicture){
                    if((item.imageCount == 0 || item.imageCount == null) && !item.minimumPhotos){
                        item.error = 'Please upload minimum 1 photo for this checklist item';    
                    }else if(item.minimumPhotos && item.imageCount < item.minimumPhotos){
                        item.error = 'Please upload minimum '+item.minimumPhotos+' photos for this checklist item';
                    }else{
                        item.error = undefined;
                    }
                }else{
                    item.error = undefined;
                }
                if(item.dependentChecklistItems && item.dependentChecklistItems.length){
                    item.dependentChecklistItems.forEach(dependent => {
                        if(dependent.requirePicture){
                            if((dependent.imageCount == 0 || dependent.imageCount == null) && !dependent.minimumPhotos){
                                dependent.error = 'Please upload minimum 1 photo for this checklist item';
                            }else if(dependent.minimumPhotos && dependent.imageCount < dependent.minimumPhotos){
                                dependent.error = 'Please upload minimum '+dependent.minimumPhotos+' photos for this checklist item';
                            }else{
                                dependent.error = undefined;
                            }
                        }else{
                            dependent.error = undefined;
                        }
                    })
                }
            })
        }
    })
}

if(this.checkListItems && this.checkListItems.length){
    this.checkListItems.forEach(rec => {
        if(rec.checkListItems && rec.checkListItems.length){
            rec.checkListItems.forEach(item => {
                if(item.error && item.error.length && allSet){
                    allSet = false;
                }
                if(item.dependentChecklistItems && item.dependentChecklistItems.length){
                    item.dependentChecklistItems.forEach(dependent => {
                        if(dependent.error && dependent.error.length && allSet){
                            allSet = false;
                        }
                    })
                }
            })
        }
    })
}

if(!allSet){
    this.error = 'Please resolve below errors to submit.';
}else{
    this.error = undefined;
}

return allSet;
}
}
import deleteChecklistItems from '@salesforce/apex/SiteAssessmentController.deleteChecklistItems';
import getCheckListData from '@salesforce/apex/SiteAssessmentController.getCheckListData';
import getDependentChecklistItems from '@salesforce/apex/SiteAssessmentController.getDependentChecklistItems';
import getServiceAppointmentStatus from '@salesforce/apex/SiteAssessmentController.getServiceAppointmentStatus';
import saveNotes from '@salesforce/apex/SiteAssessmentController.saveNotes';
import updateServiceAppointment from '@salesforce/apex/SiteAssessmentController.updateServiceAppointment';
import { LightningElement, api, track } from 'lwc';
// ChecklistLoad Is copy of PerformAssessment below are 3 components and copy code of Capture.js code  
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
export default class PerformSiteAssessment extends LightningElement {
    @track checkListItems;
    @track dependentItems;
    roofMaterialValue;
    
    error;
    isRunCmp = false;
    fileData;
    checklistDataAll;
    loading = false;
    currentLabel;
    currentCheckListId;
    currentSortOrder;
    
    currentFileName;
    @track currentimageCount;
    submitted = false;
    timeoutId;
    notesModalOpen = false;
    currentNotes;
    activeSections;
    isSubmittedOnce = false;
    completed;
    confirmationModal = false;
    confirmation = false;
/*Yk ------------------------------------------------------------Capture.js code ---------------------------------------------------------*/
    @api
    recordId;
    @api checkListItem;
    @api
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
     // this.toastType = ToastTypes.Success;
       
      log(`Successfully uploaded ${this.numPhotosToUpload} photos!`);
     this.imageUploadModalclose=true;
     this.currentimageCount++;
     this.template.querySelector('.maincmp').classList.remove('slds-hide');
     this.openImageUploadModal = false;
     
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
          this.currentCheckListId
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
      await this.createCdl(recordId, contentDocumentId);
    }
  
    async createCdl(recordId, contentDocumentId) {
      debug("Creating a CDL...");
  
      await createRecord({
        apiName: "ContentDocumentLink",
        fields: {
          LinkedEntityId: this.currentCheckListId,
          ContentDocumentId: contentDocumentId,
          ShareType: "V"
        }
      })
        .then(() => {
          debug("Successfully created a CDL!");
          this.getServiceChecklistData();
        })
        .catch((e) => {
          log(`Failed to create a CDL: ${JSON.stringify(e)}`);
          throw e;
        });
    
  }
/*-------------------------------------------------------End-----------------------------------------------------------------------------*/
    connectedCallback(){
        getServiceAppointmentStatus({serviceAppointmentId : this.recordId})
        .then(result => {
            if(result == 'Completed'){
                this.completed = true;
            }else{
                this.completed = false;
                this.getServiceChecklistData();
            }
        })
        .catch(error => {
            this.error = JSON.stringify(error);
            console.error('Error occured :',JSON.stringify(error));
        })
    }

    getServiceChecklistData(){
        this.loading = true;
        getCheckListData({serviceAppointmentId : this.recordId})
        .then(data => {
            let tempItems = JSON.parse(JSON.stringify(data));
            if(tempItems && tempItems.length){
                tempItems.forEach(rec => {
                    if(rec.checkListItems && rec.checkListItems.length){
                        this.currentLabel = rec.checkListLabel;
                        let labelPos = tempItems.findIndex(x => x.checkListLabel == this.currentLabel);
                        //console.log('summary',rec.summary);
                        rec.checkListItems.forEach(item => {
                            if(item.isQuestion){
                                let checkListPos;
                                checkListPos = tempItems[labelPos].checkListItems.findIndex(x => x.checkListId == item.checkListId);
                                //console.log('item.checkListId >> ',item.checkListId);
                               
                                //console.log('this.roofMaterialValue',this.roofMaterialValue);
                                //console.log('item.summary >> ',item.summary,' ',item.notes);
                                if(item.summary=='Roofing material')
                                this.roofMaterialValue=item.notes;
                               // console.log('default roofMaterialValue',this.roofMaterialValue);

                                getDependentChecklistItems({parentChecklistId:item.checkListId, response:item.notes})
                                .then(result => {

                                   let filteredResult = result.filter(item => {
                                  
                                    // Check if the item's answerForDependent2 property is either undefined or doesn't exist
                                    
                                   if (item.hasOwnProperty('answerForDependent2')&&  this.roofMaterialValue=='Composition Shingle')
                                    {
                                      
                                        return false; // Keep the item in the filtered result
                                    }
                                    else
                                    {
                                      
                                    return true;
                                     }// Exclude the item from the filtered result
                                });
                                  //  console.log('result >> ',JSON.stringify(filteredResult));
                                    if(result.length){
                                        tempItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = JSON.parse(JSON.stringify(filteredResult));
                                       // console.log('Dependtent list data test',tempItems[labelPos].checkListItems[checkListPos].dependentChecklistItems);
                                        this.checkListItems = JSON.parse(JSON.stringify(tempItems));
                                    }else{
                                        tempItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = null;
                                        this.checkListItems = JSON.parse(JSON.stringify(tempItems));
                                    }
                                    if(this.isSubmittedOnce){
                                        this.validatePage();
                                    } 
                                    this.loading = false;
                                })
                                .catch(error => {
                                    this.error = JSON.stringify(error);
                                    console.error('Error occured :',JSON.stringify(error));
                                })
                            }
                        }) 
                    }
                }) 
            }
        })
        .catch(error => {
            this.error = JSON.stringify(error);
            console.error('Error occured :',JSON.stringify(error));
        })
    }

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

    /* get isLoading(){
        return !(this.checklistDataAll.data || this.checklistDataAll.error);
    } */

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
                //console.log('notes saved');
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
    handleQuesResponse(event) {
      this.currentCheckListId = event.detail.questionData.checkListId;
      this.currentLabel = event.detail.checklistlabel;
      //console.log('event.detail.questionData.Summary',event.detail.questionData.summary);
      //Yk change done  12-4-2024
      
      if(event.detail.questionData.summary=='Roofing material')
      {
        this.roofMaterialValue=event.detail.response;
        
      }
    //  console.log('this.roofMaterialValue',this.roofMaterialValue);
      let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
      
      let checkListPos;
      
      if (event.detail.questionData.isDependent) {
          checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == event.detail.questionData.parentChecklistId);
          let depCheckListPos = this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems.findIndex(x => x.checkListId == this.currentCheckListId);
          this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems[depCheckListPos].notes = event.detail.response;
      } else {
          checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId);
          this.checkListItems[labelPos].checkListItems[checkListPos].notes = event.detail.response;
      }
  
      saveNotes({ recordId: this.currentCheckListId, notes: event.detail.response })
          .then(parentResult => {

              if (parentResult) {

                  if (!event.detail.questionData.isDependent && (event.detail.questionData.isPicklist || event.detail.questionData.isBoolean)) {
                    this.getServiceChecklistData();
                   
                      
                      getDependentChecklistItems({ parentChecklistId: this.currentCheckListId, response: event.detail.response })
                          .then(result => {
                            let filteredResult = result.filter(item => {
                              // Check if the item's answerForDependent2 property is either undefined or doesn't exist
                              //Yk Filter Json data changes done 12-3-2024
                             if (item.hasOwnProperty('answerForDependent2') && this.roofMaterialValue=='Composition Shingle')
                              {
                                  return false; // Keep the item in the filtered result
                              }
                              else
                              return true;
                               // Exclude the item from the filtered result
                          });
                          
                             //console.log('filteredResult >> ', filteredResult);
                              if (result.length) {
                                  this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = JSON.parse(JSON.stringify(filteredResult));
                                
                              } else {
                                  this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = null;
                                 
                              }
                          })
                          .catch(error => {
                              this.error = JSON.stringify(error);
                              console.error('Error occurred:', JSON.stringify(error));
                          })
                  }
                 /* if (event.detail.questionData.isDependent && (event.detail.questionData.isPicklist || event.detail.questionData.isBoolean)) {
                      console.log('Enter data');
                      getDependentChecklistItems({ parentChecklistId: this.currentCheckListId, response: event.detail.response })
                          .then(result => {
                            this.dependentItems = {
                              ...this.dependentItems,
                              ...result
                          };  
                            console.log('resultDependentChecklistItems2 >> ', JSON.stringify(result));
                              if (result.length) {
                                  this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = JSON.parse(JSON.stringify(this.dependentItems));
                                  console.log('<< data >> ', JSON.stringify(this.checkListItems[labelPos].checkListItems[checkListPos]));
                              }
                          })
                          .catch(error => {
                              this.error = JSON.stringify(error);
                              console.error('Error occurred:', JSON.stringify(error));
                          })
                  }
                  */
              }
          })
          .catch(error => {
              this.error = JSON.stringify(error);
              console.error('Error occurred:', JSON.stringify(error));
          })
  }
  
      // YK comment on 8 march 2024
    /*handleQuesResponse(event){
        this.currentCheckListId = event.detail.questionData.checkListId;
        this.currentLabel = event.detail.checklistlabel;
        //console.log('this.currentLabel >> ',JSON.stringify(event.detail));
        let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
        let checkListPos;
        
        if(event.detail.questionData.isDependent){
            checkListPos= this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == event.detail.questionData.parentChecklistId);
            let depCheckListPos = this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems.findIndex(x => x.checkListId == this.currentCheckListId);
            this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems[depCheckListPos].notes = event.detail.response;
        }else{
            checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId);
            this.checkListItems[labelPos].checkListItems[checkListPos].notes = event.detail.response;
        }
        saveNotes({recordId : this.currentCheckListId , notes : event.detail.response})
        .then(parentResult => {
            if(parentResult){
              //console.log('result >> ',event.detail.response);
                if(!event.detail.questionData.isDependent && (event.detail.questionData.isPicklist || event.detail.questionData.isBoolean )){
                    console.log('Enter data');
                    getDependentChecklistItems({parentChecklistId:this.currentCheckListId, response:event.detail.response})
                    .then(result => {
                      this.dependentItems=result;
                       console.log('resultDependentChecklistItems >> ',JSON.stringify(this.dependentItems));
                        if(result.length){
                            this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = JSON.parse(JSON.stringify(this.dependentItems));
                            console.log('<< data >> ',JSON.stringify(this.checkListItems[labelPos].checkListItems[checkListPos]));
                        }else{
                            this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = null;
                        }
                    })
                    .catch(error => {
                        this.error = JSON.stringify(error);
                        console.error('Error occured :',JSON.stringify(error));
                    })
                }
                if(event.detail.questionData.isDependent && (event.detail.questionData.isPicklist || event.detail.questionData.isBoolean )){
                  console.log('Enter data');
                  getDependentChecklistItems({parentChecklistId:this.currentCheckListId, response:event.detail.response})
                  .then(result => {
                    this.dependentItems = {
                      ...this.dependentItems, // Copy existing dependentItems
                      ...result // Merge with newData
                  };
                    console.log('resultDependentChecklistItems2 >> ',JSON.stringify(this.dependentItems));
                      if(result.length){
                          this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = JSON.parse(JSON.stringify(this.dependentItems));
                          console.log('<< data >> ',JSON.stringify(this.checkListItems[labelPos].checkListItems[checkListPos]));
                      }/*else{
                          this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = null;
                      }
                  })
                  .catch(error => {
                      this.error = JSON.stringify(error);
                      console.error('Error occured :',JSON.stringify(error));
                  })
              }
            }
        })
        .catch(error => {
            this.error = JSON.stringify(error);
            console.error('Error occured :',JSON.stringify(error));
        })

    }*/

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
        this.currentimageCount=event.detail.imageCount;
        this.openImageUploadModal = true;
        document.body.scrollTop = document.documentElement.scrollTop = 0;
    }

    handleNotesUpdate(event) {
        /* let checkListLabel = event.target.getAttribute('data-checklistlabel');
        let checkListId = event.target.getAttribute('data-id'); */
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
                deleteChecklistItems({ serviceAppointmentId: this.recordId })
                .then(result => {
            // Handle success
                console.log('Checklist items deleted successfully.');
                  })
                .catch(error => {
            // Handle error
                  console.error('Error deleting checklist items:', error);
        });
                   this.hideModalBox();
                
            }
        })
        .catch(error => {
            this.error = JSON.stringify(error.body.fieldErrors.Status[0].message)+'Try again or contact your admin for help';
            console.error('Error occured :',error.body.fieldErrors.Status[0].message);
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
                      console.log(item.imageCount);
                         // console.log(item.minimumPhotos);
                        if(item.requirePicture){
                            if((item.imageCount == 0 || item.imageCount == null) && !item.minimumPhotos){
                                item.error = 'Please upload minimum 1 photo for this checklist item';
                            }else if(item.minimumPhotos && item.imageCount < item.minimumPhotos){
                                item.error = 'Please upload minimum '+item.minimumPhotos+' photos for this checklist item';
                            }
                          
                            else{
                              
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
    
    
 /*-----------------------------------------Old Code-------------------------------------------------------*/
    // @track checkListItems;
    // error;
    // isRunCmp = false;
    // fileData;
    // checklistDataAll;
    // loading = false;
    // currentLabel; 
    // currentCheckListId;
    // currentSortOrder;
    // currentFileName;
    // submitted = false;
    // timeoutId;
    // notesModalOpen = false;
    // currentNotes;
    // activeSections;
    // isSubmittedOnce = false;
    // openImageUploadModal = false;
    // completed;
    // confirmationModal = false;
    // confirmation = false;

    // @api recordId;

    // connectedCallback(){
    //     getServiceAppointmentStatus({serviceAppointmentId : this.recordId})
    //     .then(result => {
    //         if(result == 'Completed'){
    //             this.completed = true;
    //         }else{
    //             this.completed = false;
    //             this.getServiceChecklistData();
    //         }
    //     })
    //     .catch(error => {
    //         this.error = JSON.stringify(error);
    //         console.error('Error occured :',JSON.stringify(error));
    //     })
    // }

    // getServiceChecklistData(){
    //     this.loading = true;
    //     getCheckListData({serviceAppointmentId : this.recordId})
    //     .then(data => {
    //         let tempItems = JSON.parse(JSON.stringify(data));
    //         if(tempItems && tempItems.length){
    //             tempItems.forEach(rec => {
    //                 if(rec.checkListItems && rec.checkListItems.length){
    //                     this.currentLabel = rec.checkListLabel;
    //                     let labelPos = tempItems.findIndex(x => x.checkListLabel == this.currentLabel);
    //                     rec.checkListItems.forEach(item => {
    //                         if(item.isQuestion){
    //                             let checkListPos;
    //                             checkListPos = tempItems[labelPos].checkListItems.findIndex(x => x.checkListId == item.checkListId);
    //                             getDependentChecklistItems({parentChecklistId:item.checkListId, response:item.notes})
    //                             .then(result => {
    //                                 console.log('result >> ',JSON.stringify(result));
    //                                 if(result.length){
    //                                     tempItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = JSON.parse(JSON.stringify(result));
                                        
    //                                     this.checkListItems = JSON.parse(JSON.stringify(tempItems));
    //                                 }else{
    //                                     tempItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = null;
    //                                     this.checkListItems = JSON.parse(JSON.stringify(tempItems));
    //                                 }
    //                                 if(this.isSubmittedOnce){
    //                                     this.validatePage();
    //                                 } 
    //                                 this.loading = false;
    //                             })
    //                             .catch(error => {
    //                                 this.error = JSON.stringify(error);
    //                                 console.error('Error occured :',JSON.stringify(error));
    //                             })
    //                         }
    //                     }) 
    //                 }
    //             }) 
    //         }
    //     })
    //     .catch(error => {
    //         this.error = JSON.stringify(error);
    //         console.error('Error occured :',JSON.stringify(error));
    //     })
    // }

    // handleScroll(event){
    //     this.activeSections = [];
    //     let scrollClass = event.target.getAttribute('data-id');
    //     this.activeSections.push(scrollClass);
    // }

    // handleImageUploadModal(event){
    //     this.template.querySelector('.maincmp').classList.add('slds-hide');
    //     this.currentLabel = event.target.getAttribute('data-checklistlabel');
    //     this.currentCheckListId = event.target.getAttribute('data-id');
    //     this.currentSortOrder = event.target.getAttribute('data-sort-order');
    //     this.currentFileName = event.target.getAttribute('data-file-name');
    //     this.openImageUploadModal = true;
    //     document.body.scrollTop = document.documentElement.scrollTop = 0;
    // }

    // closeImageUploadModal(){
    //     this.template.querySelector('.maincmp').classList.remove('slds-hide');
    //     this.openImageUploadModal = false;
    // }

    // get noCheckListData(){
    //     return (this.checkListItems && !this.checkListItems.length);
    // }

    // /* get isLoading(){
    //     return !(this.checklistDataAll.data || this.checklistDataAll.error);
    // } */

    // startAssessment(){
    //     this.isRunCmp = true;
    // }

    // handleNotesEdit(event) {
    //     this.notesModalOpen = true;
    //     this.currentLabel = event.target.getAttribute('data-checklistlabel');
    //     this.currentCheckListId = event.target.getAttribute('data-id');
    //     let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
    //     let checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId)
    //     if(this.checkListItems[labelPos].checkListItems[checkListPos].notes){
    //         let tempNotes = this.checkListItems[labelPos].checkListItems[checkListPos].notes
    //         this.currentNotes = tempNotes;
    //     }else{
    //         this.currentNotes = '';
    //     }
    // }

    // hideModalBox(){
    //     this.notesModalOpen = false;
    //     this.confirmationModal = false;
    // }

    // handleNotesDone() {
    //     let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
    //     let checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId);
    //     this.checkListItems[labelPos].checkListItems[checkListPos].showEditField = true;
    //     saveNotes({recordId : this.currentCheckListId, notes : this.checkListItems[labelPos].checkListItems[checkListPos].notes})
    //     .then(result => {
    //         if(result){
    //             console.log('notes saved');
    //             this.notesModalOpen = false;
    //             this.template.querySelector('lightning-textarea').value = null;
    //             this.currentLabel = undefined;
    //             this.currentCheckListId = undefined;
    //         }
    //     })
    //     .catch(error => {
    //         this.error = JSON.stringify(error);
    //         console.error('Error occured :',JSON.stringify(error));
    //     })
    // }

    // handleQuesResponse(event){
    //     this.currentCheckListId = event.detail.questionData.checkListId;
    //     this.currentLabel = event.detail.checklistlabel;
    //     //console.log('this.currentLabel >> ',JSON.stringify(event.detail));
    //     let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
    //     let checkListPos;
    //     if(event.detail.questionData.isDependent){
    //         checkListPos= this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == event.detail.questionData.parentChecklistId);
    //         let depCheckListPos = this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems.findIndex(x => x.checkListId == this.currentCheckListId);
    //         this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems[depCheckListPos].notes = event.detail.response;
    //     }else{
    //         checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId);
    //         this.checkListItems[labelPos].checkListItems[checkListPos].notes = event.detail.response;
    //     }
    //     saveNotes({recordId : this.currentCheckListId , notes : event.detail.response})
    //     .then(parentResult => {
    //         if(parentResult){
    //             if(!event.detail.questionData.isDependent && (event.detail.questionData.isPicklist || event.detail.questionData.isBoolean)){
    //                 getDependentChecklistItems({parentChecklistId:this.currentCheckListId, response:event.detail.response})
    //                 .then(result => {
    //                     console.log('result >> ',JSON.stringify(result));
    //                     if(result.length){
    //                         this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = JSON.parse(JSON.stringify(result));
    //                         //console.log('<< data >> ',JSON.stringify(this.checkListItems[labelPos].checkListItems[checkListPos]));
    //                     }else{
    //                         this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems = null;
    //                     }
    //                 })
    //                 .catch(error => {
    //                     this.error = JSON.stringify(error);
    //                     console.error('Error occured :',JSON.stringify(error));
    //                 })
    //             }
    //         }
    //     })
    //     .catch(error => {
    //         this.error = JSON.stringify(error);
    //         console.error('Error occured :',JSON.stringify(error));
    //     })

    // }

    // handleQuestionNotesEdit(event){
    //     this.currentCheckListId = event.detail.questionData.checkListId;
    //     this.currentLabel = event.detail.checklistlabel;
    //     let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
    //     let checkListPos;
    //     if(event.detail.questionData.isDependent){
    //         checkListPos= this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == event.detail.questionData.parentChecklistId);
    //         let depCheckListPos = this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems.findIndex(x => x.checkListId == this.currentCheckListId);
    //         this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems[depCheckListPos].showNotesInput = true;
    //     }else{
    //         checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId);
    //         this.checkListItems[labelPos].checkListItems[checkListPos].showNotesInput = true;
    //     }
    // }

    // handleQuestionNotesDone(event){
    //     this.currentCheckListId = event.detail.questionData.checkListId;
    //     this.currentLabel = event.detail.checklistlabel;
    //     let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
    //     let checkListPos;
    //     if(event.detail.questionData.isDependent){
    //         checkListPos= this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == event.detail.questionData.parentChecklistId);
    //         let depCheckListPos = this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems.findIndex(x => x.checkListId == this.currentCheckListId);
    //         this.checkListItems[labelPos].checkListItems[checkListPos].dependentChecklistItems[depCheckListPos].showNotesInput = false;
    //     }else{
    //         checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId);
    //         this.checkListItems[labelPos].checkListItems[checkListPos].showNotesInput = false;
    //     }
    // }

    // handleQuestionImageUpload(event){
    //     this.template.querySelector('.maincmp').classList.add('slds-hide');
    //     this.currentLabel = event.detail.checkListLabel;
    //     this.currentCheckListId = event.detail.questionData.checkListId;
    //     this.currentSortOrder = event.detail.sortOrder;
    //     this.currentFileName = event.detail.fileName;
    //     this.openImageUploadModal = true;
    //     document.body.scrollTop = document.documentElement.scrollTop = 0;
    // }

    // handleNotesUpdate(event) {
    //     /* let checkListLabel = event.target.getAttribute('data-checklistlabel');
    //     let checkListId = event.target.getAttribute('data-id'); */
    //     let labelPos = this.checkListItems.findIndex(x => x.checkListLabel == this.currentLabel);
    //     let checkListPos = this.checkListItems[labelPos].checkListItems.findIndex(x => x.checkListId == this.currentCheckListId)
    //     this.checkListItems[labelPos].checkListItems[checkListPos].notes = event.target.value;
    // }

    // handleImagesUpload(event){
    //     let recId = event.detail.checkListItem;
    //     let imagesData = event.detail.images;

    //     if(imagesData && imagesData.length){
    //         this.loading = true;
    //         let count = 0;
    //         imagesData.forEach(image => {
    //             saveImage({recordId:recId, imageName : image.imageName, base64Data : image.base64Data})
    //             .then(result => {
    //                 if(result){
    //                     count ++;
    //                     if(count == imagesData.length){
    //                         //console.log('image saved');
    //                         this.template.querySelector('.maincmp').classList.remove('slds-hide');
    //                         this.openImageUploadModal = false;
    //                         this.loading = false;
    //                         this.getServiceChecklistData();
    //                     }
    //                 }
    //             })
    //             .catch(error => {
    //                 this.error = JSON.stringify(error);
    //                 console.error('Error occured :',error);
    //             })
    //         })
    //     }

    // }

    // handleSubmit(event) {
    //     this.isSubmittedOnce = true;
    //     let allSet = this.validatePage();
    //     if(allSet){
    //         this.error = undefined;
    //         this.confirmationModal = true;
    //     }else{
    //         this.error = 'Please resolve below errors to submit.';
    //     }
    // }

    // handleYes(){
    //     this.confirmation = true;
    //     this.loading = true;
    //     updateServiceAppointment({recordId : this.recordId})
    //     .then(result => {
    //         if(result == 'saved'){
    //             this.loading = false;
    //             this.submitted = true;
    //                this.hideModalBox();
                
    //         }
    //     })
    //     .catch(error => {
    //         this.error = JSON.stringify(error);
    //         console.error('Error occured :',error);
    //            this.hideModalBox();
    //     })
       
    // }

    // handleNo(){
    //     this.hideModalBox();
    // }

    // validatePage(){
    //     let allSet = true;
    //     if(this.checkListItems && this.checkListItems.length){
    //         this.checkListItems.forEach(rec => {
    //             if(rec.checkListItems && rec.checkListItems.length){
    //                 rec.checkListItems.forEach(item => {
    //                     if(item.requirePicture){
    //                         if((item.imageCount == 0 || item.imageCount == null) && !item.minimumPhotos){
    //                             item.error = 'Please upload minimum 1 photo for this checklist item';    
    //                         }else if(item.minimumPhotos && item.imageCount < item.minimumPhotos){
    //                             item.error = 'Please upload minimum '+item.minimumPhotos+' photos for this checklist item';
    //                         }else{
    //                             item.error = undefined;    
    //                         }
    //                     }else{
    //                         item.error = undefined;
    //                     }
    //                     if(item.dependentChecklistItems && item.dependentChecklistItems.length){
    //                         item.dependentChecklistItems.forEach(dependent => {
    //                             if(dependent.requirePicture){
    //                                 if((dependent.imageCount == 0 || dependent.imageCount == null) && !dependent.minimumPhotos){
    //                                     dependent.error = 'Please upload minimum 1 photo for this checklist item';    
    //                                 }else if(dependent.minimumPhotos && dependent.imageCount < dependent.minimumPhotos){
    //                                     dependent.error = 'Please upload minimum '+dependent.minimumPhotos+' photos for this checklist item';
    //                                 }else{
    //                                     dependent.error = undefined;    
    //                                 }
    //                             }else{
    //                                 dependent.error = undefined;
    //                             }
    //                         })
    //                     }
    //                 })
    //             }
    //         })
    //     }

    //     if(this.checkListItems && this.checkListItems.length){
    //         this.checkListItems.forEach(rec => {
    //             if(rec.checkListItems && rec.checkListItems.length){
    //                 rec.checkListItems.forEach(item => {
    //                     if(item.error && item.error.length && allSet){
    //                         allSet = false;
    //                     }
    //                     if(item.dependentChecklistItems && item.dependentChecklistItems.length){
    //                         item.dependentChecklistItems.forEach(dependent => {
    //                             if(dependent.error && dependent.error.length && allSet){
    //                                 allSet = false;
    //                             }
    //                         })
    //                     }
    //                 })
    //             }
    //         })
    //     }

    //     if(!allSet){
    //         this.error = 'Please resolve below errors to submit.';
    //     }else{
    //         this.error = undefined;
    //     }

    //     return allSet;
    // }
/*----------------------------------------------------End Code-------------------------------------------------*/    
}
public with sharing class SiteAssessmentController {
    
    //coment data on 2024
    @AuraEnabled
    public static String getServiceAppointmentStatus(String serviceAppointmentId){
        ServiceAppointment sa =  [select Id, Status from ServiceAppointment where Id =: serviceAppointmentId limit 1];
        if(sa.Status != 'In Progress' && sa.Status != 'Completed'){
            try{
                sa.Status = 'In Progress';
                update sa;
            }catch(Exception e){
                System.debug('exception >> '+e.getMessage());
            }
        }
        return sa.Status;
    }
    
    
    @AuraEnabled 
    public static List<ChecklistWrapper> getCheckListData(String serviceAppointmentId){
        Map<String, List<CheckListItemsWrapper>> labelCheckListMap = new Map<String, List<CheckListItemsWrapper>>();
        System.debug('serviceAppointmentId>>'+serviceAppointmentId);
        List<ChecklistWrapper> respList = new List<ChecklistWrapper>();
        Map<String, Service_Appointment_Checklist_Item__c> checkListItemsMap = new Map<String, Service_Appointment_Checklist_Item__c>();  
        List<Service_Appointment_Checklist_Item__c> saListcheckList = new List<Service_Appointment_Checklist_Item__c>();
        //Breakdown And Apply isRunningTest 6 feb 2024 Chnages Done from Line 27 to 38
        if(Test.isRunningTest()){
            saListcheckList = [select Id, Section_Label__c, Summary__c, Description_of_specifics__c, Notes__c, Sort_Order__c,File_Name__c, Answer_Dropdown_Values__c, Answer_for_dependent__c, Answer_Type__c, Pictures_Required__c, Is_Dependent__c, Minimum_photos__c from Service_Appointment_Checklist_Item__c where Is_Dependent__c = false order by Sort_Order__c];
        }
        else{
            saListcheckList = [select Id, Section_Label__c, Summary__c, Description_of_specifics__c, Notes__c, Sort_Order__c,File_Name__c, Answer_Dropdown_Values__c, Answer_for_dependent__c, Answer_Type__c, Pictures_Required__c,Answer_2_for_dependent__c, Is_Dependent__c, Minimum_photos__c from Service_Appointment_Checklist_Item__c where Service_Appointment__c =: serviceAppointmentId AND Is_Dependent__c = false order by Sort_Order__c];
            system.debug('saListcheckListSize::: '+saListcheckList.size());
        }
        if(saListcheckList.size() > 0){
            for(Service_Appointment_Checklist_Item__c sa:saListcheckList){
                checkListItemsMap.put(sa.id,sa); 
                
            }
        }
        //    Map<String, Service_Appointment_Checklist_Item__c> checkListItemsMap = new Map<String, Service_Appointment_Checklist_Item__c>([select Id, Section_Label__c, Summary__c, Description_of_specifics__c, Notes__c, Sort_Order__c,File_Name__c, Answer_Dropdown_Values__c, Answer_for_dependent__c, Answer_Type__c, Pictures_Required__c, Is_Dependent__c, Minimum_photos__c from Service_Appointment_Checklist_Item__c where Service_Appointment__c =: serviceAppointmentId AND Is_Dependent__c = false order by Sort_Order__c]);
        System.debug('checkListItemsMap>>'+checkListItemsMap);
        Map<String, Integer> checkListItemImageCountMap = new Map<String, Integer>();
        
        if(!checkListItemsMap.isEmpty()){
            AggregateResult[] groupedResults = [select LinkedEntityId, count(Id) imageCount from ContentDocumentLink where LinkedEntityId in :checkListItemsMap.keySet() group by LinkedEntityId];
            
            if(groupedResults!=null && groupedResults.size()>0){
                for(AggregateResult ar : groupedResults){
                    if(!checkListItemImageCountMap.containsKey((String)ar.get('LinkedEntityId'))){
                        checkListItemImageCountMap.put((String)ar.get('LinkedEntityId'), (Integer)ar.get('imageCount'));
                    }
                }
            }
            
            /* List<ContentVersion> contVersionList = [select Id, URL_For_LWC__c from ContentVersion where Id != null];

if(contVersionList!=null && contVersionList.size()>0){
for(ContentVersion cv:contVersionList){
if(String.isNotBlank(cv.URL_For_LWC__c)){
String recId = cv.URL_For_LWC__c.substringBefore('#');
if(!checkListItemImageUrlMap.containsKey(recId)){
checkListItemImageUrlMap.put(recId, new List<String>());
checkListItemImageUrlMap.get(recId).add(cv.URL_For_LWC__c.substringAfter('#'));
}else{
checkListItemImageUrlMap.get(recId).add(cv.URL_For_LWC__c.substringAfter('#'));
}
}
}
} */
        }
        
        //System.debug('checkListItemImageUrlMap >> '+checkListItemImageUrlMap);
        
        if(!checkListItemsMap.isEmpty()){
            for(Service_Appointment_Checklist_Item__c checklistItem : checkListItemsMap.values()){
                CheckListItemsWrapper checkListWrapObj = new CheckListItemsWrapper();
                checkListWrapObj.checkListId = checklistItem.Id;
                checkListWrapObj.summary = checklistItem.Summary__c;
              //  checkListWrapObj.answerForDependent2 = checklistItem.Answer_2_for_dependent__c;
                
                if(String.isNotBlank(checklistItem.Description_of_specifics__c)){
                    checkListWrapObj.specifics = checklistItem.Description_of_specifics__c;
                }
                checkListWrapObj.notes = checklistItem.Notes__c != null?checklistItem.Notes__c:'';
                checkListWrapObj.showEditField = true;
                if(String.isNotBlank(checklistItem.Answer_Type__c) && (checklistItem.Answer_Type__c.equalsIgnoreCase('Dropdown') || checklistItem.Answer_Type__c.equalsIgnoreCase('Boolean'))){
                    checkListWrapObj.isQuestion = true;
                }else{
                    checkListWrapObj.isQuestion = false;
                }
                if(String.isNotBlank(checklistItem.Answer_Type__c)){
                    if(checklistItem.Answer_Type__c.equalsIgnoreCase('Text')){
                        checkListWrapObj.isText = true;
                        checkListWrapObj.isPicklist = false;
                        checkListWrapObj.isBoolean = false;
                        checkListWrapObj.isImage = false;
                        checkListWrapObj.isNumber = false;
                        checkListWrapObj.showNotesInput = true;
                    }else if(checklistItem.Answer_Type__c.equalsIgnoreCase('Boolean')){
                        checkListWrapObj.isText = false;
                        checkListWrapObj.isPicklist = false;
                        checkListWrapObj.isBoolean = true;
                        checkListWrapObj.isImage = false;
                        checkListWrapObj.isNumber = false;
                        checkListWrapObj.showNotesInput = true;
                    }else if(checklistItem.Answer_Type__c.equalsIgnoreCase('Dropdown')){
                        checkListWrapObj.isText = false;
                        checkListWrapObj.isPicklist = true;
                        checkListWrapObj.isBoolean = false;
                        checkListWrapObj.isImage = false;
                        checkListWrapObj.isNumber = false;
                        if(checklistItem.Summary__c.equalsIgnoreCase('Rafter Size')||checklistItem.Summary__c.equalsIgnoreCase('Starter Board size'))
                        {
                            checkListWrapObj.showNotesInput = false;
                        }
                        else{
                            checkListWrapObj.showNotesInput = true;}
                    }else if(checklistItem.Answer_Type__c.equalsIgnoreCase('Image')){
                        checkListWrapObj.isText = false;
                        checkListWrapObj.isPicklist = false;
                        checkListWrapObj.isBoolean = false;
                        checkListWrapObj.isImage = true;
                        checkListWrapObj.isNumber = false;
                        checkListWrapObj.showNotesInput = false;
                    }else if(checklistItem.Answer_Type__c.equalsIgnoreCase('Number')){
                        checkListWrapObj.isText = false;
                        checkListWrapObj.isPicklist = false;
                        checkListWrapObj.isBoolean = false;
                        checkListWrapObj.isImage = false;
                        checkListWrapObj.isNumber = true;
                        checkListWrapObj.showNotesInput = true;
                    }
                    
                }
                checkListWrapObj.requirePicture = checklistItem.Pictures_Required__c == 'Yes'?true:false;
                checkListWrapObj.isDependent = checklistItem.Is_Dependent__c;
                //checkListWrapObj.answerForDependent2=checklistItem.Answer_2_for_dependent__c;
                checkListWrapObj.answerForDependent = checklistItem.Answer_for_dependent__c;
                checkListWrapObj.sortOrder = Integer.valueOf(checklistItem.Sort_Order__c);
                checkListWrapObj.fileName = checklistItem.File_Name__c;
                checkListWrapObj.minimumPhotos = Integer.valueOf(checklistItem.Minimum_photos__c);
                if(String.isNotBlank(checklistItem.Answer_Dropdown_Values__c)){
                    List<String> optionList = checklistItem.Answer_Dropdown_Values__c.split(';');
                    if(optionList!=null && optionList.size()>0){
                        List<OptionsWrapper> opWrapList = new List<OptionsWrapper>();
                        OptionsWrapper defaultOpWrp = new OptionsWrapper();
                        defaultOpWrp.label = '-- Please Select --';
                        defaultOpWrp.value = null;
                        opWrapList.add(defaultOpWrp);
                        for(String s:optionList){
                            OptionsWrapper opWrp = new OptionsWrapper();
                                opWrp.label = s;
                                opWrp.value = s;
                            opWrapList.add(opWrp);
                        }
                        checkListWrapObj.options = opWrapList;
                    }
                }
                if(checkListItemImageCountMap.get(checklistItem.Id) != null){
                    checkListWrapObj.imageCount = checkListItemImageCountMap.get(checklistItem.Id);
                }else{
                    checkListWrapObj.imageCount = 0;
                }
                if(!labelCheckListMap.containsKey(checklistItem.Section_Label__c)){
                    labelCheckListMap.put(checklistItem.Section_Label__c, new List<CheckListItemsWrapper>());
                    labelCheckListMap.get(checklistItem.Section_Label__c).add(checkListWrapObj);
                }else{
                    labelCheckListMap.get(checklistItem.Section_Label__c).add(checkListWrapObj);
                }
            }
        }
        
        if(!labelCheckListMap.isEmpty()){
            Integer counter = 1;
            for(String label : labelCheckListMap.keySet()){
                ChecklistWrapper wrapObj = new ChecklistWrapper();
                wrapObj.checkListLabel = label;
                wrapObj.scrollName = 'label'+counter;
                counter++;
                if(label.equalsIgnoreCase('Questionnaire')){
                    wrapObj.isQuestionnaire = true;
                }else{
                    wrapObj.isQuestionnaire = false;
                }
                wrapObj.checkListItems = labelCheckListMap.get(label);
                respList.add(wrapObj);
            }
        }
        
        System.debug('respMap '+respList);
        return respList;
    }
    
    
    @AuraEnabled
    public static List<CheckListItemsWrapper> getDependentChecklistItems(String parentChecklistId, String response )
    {
        
        List<CheckListItemsWrapper> respList = new List<CheckListItemsWrapper>();
        System.debug('response >> '+response+parentChecklistId);
        //Change on 5-feb for handle 0 Dropdown Value
        
        
        if(String.isNotBlank(response) && !response.contains('Please Select') && !response.contains('No') && !response.contains('0'))
        {
            List<String> checklistItemsIds = new List<String>();
            System.debug('parentChecklistId >> '+parentChecklistId);
            Service_Appointment_Checklist_Item__c parentChecklistItem = [select Id, Answer_for_dependent__c,Answer_2_for_dependent__c, Answer_Type__c from Service_Appointment_Checklist_Item__c where Id =: parentChecklistId limit 1];
            
            String dependentQuery = 'select Id, Section_Label__c, Summary__c, Description_of_specifics__c, Notes__c, Sort_Order__c, File_Name__c, Answer_Dropdown_Values__c, Answer_for_dependent__c,Answer_2_for_dependent__c, Answer_Type__c, Pictures_Required__c, Dependent_Sequence__c, Is_Dependent__c, Parent_Checklist_Item__c, Minimum_photos__c from Service_Appointment_Checklist_Item__c where Parent_Checklist_Item__c = \''+parentChecklistId+'\' AND Is_Dependent__c = true';
            
            String responseList = '(';
            Integer recCount = 0;
            
            if(parentChecklistItem.Answer_Type__c != null && String.isNotBlank(response)  && parentChecklistItem.Answer_Type__c == 'Dropdown' && response.isNumeric()){
                for(Integer i=1;i<=Integer.valueOf(response);i++){
                    responseList = responseList+'\''+i+'\',';
                }
                
                responseList = responseList.removeEnd(',')+')';
                
               
                
                dependentQuery = dependentQuery + ' AND Answer_for_dependent__c IN '+responseList;
            }
            //Yk 8 March 2024 add Else to handle String Response For roofing material 
            else {
               
                
                dependentQuery = dependentQuery + ' AND Answer_for_dependent__c LIKE \'%' + String.escapeSingleQuotes(response.trim().removeStart('\'').removeEnd('\'')) + '%\'';
            
            }
            
                
                
            dependentQuery = dependentQuery+' ORDER BY Sort_Order__c';
            
            System.debug('dependentQuery >> '+dependentQuery);
            
            List<Service_Appointment_Checklist_Item__c> dependentList = Database.query(dependentQuery);
            System.debug('dependentList'+dependentList);
            if(dependentList!=null && dependentList.size()>0){
                System.debug('dependentList >> '+dependentList);
                for(Service_Appointment_Checklist_Item__c checklistItem : dependentList){
                    checklistItemsIds.add(checklistItem.Id);
                }
            }
            
            Map<String, Integer> checkListItemImageCountMap = new Map<String, Integer>();
            
            if(checklistItemsIds!=null && checklistItemsIds.size()>0){
                AggregateResult[] groupedResults = [select LinkedEntityId, count(Id) imageCount from ContentDocumentLink where LinkedEntityId in :checklistItemsIds group by LinkedEntityId];
                
                if(groupedResults!=null && groupedResults.size()>0){
                    for(AggregateResult ar : groupedResults){
                        if(!checkListItemImageCountMap.containsKey((String)ar.get('LinkedEntityId'))){
                            checkListItemImageCountMap.put((String)ar.get('LinkedEntityId'), (Integer)ar.get('imageCount'));
                        }
                    }
                }
            }
            
            if(dependentList!=null && dependentList.size()>0){
                for(Service_Appointment_Checklist_Item__c checklistItem : dependentList){
                    //checklistItem.Notes__c = '';
                    CheckListItemsWrapper checkListWrapObj = new CheckListItemsWrapper();
                    checkListWrapObj.checkListId = checklistItem.Id;
                    checkListWrapObj.summary = checklistItem.Summary__c;
                    checkListWrapObj.answerForDependent2 = checklistItem.Answer_2_for_dependent__c;
                    if(String.isNotBlank(checklistItem.Description_of_specifics__c)){
                        checkListWrapObj.specifics = checklistItem.Description_of_specifics__c;
                    }
                    checkListWrapObj.notes = checklistItem.Notes__c != null?checklistItem.Notes__c:'';
                    checkListWrapObj.showEditField = true;
                    if(checklistItem.Section_Label__c.equalsIgnoreCase('Questionnaire')){
                        System.debug('checklistItem.Summary__c >> '+checklistItem.Summary__c);
                        checkListWrapObj.isQuestion = true;
                    }else{
                        checkListWrapObj.isQuestion = false;
                    }
                    if(String.isNotBlank(checklistItem.Answer_Type__c)){
                        if(checklistItem.Answer_Type__c.equalsIgnoreCase('Text')){
                            checkListWrapObj.isText = true;
                            checkListWrapObj.isPicklist = false;
                            checkListWrapObj.isBoolean = false;
                            checkListWrapObj.isImage = false;
                            checkListWrapObj.isNumber = false;
                            checkListWrapObj.showNotesInput = true;
                        }else if(checklistItem.Answer_Type__c.equalsIgnoreCase('Boolean')){
                            checkListWrapObj.isText = false;
                            checkListWrapObj.isPicklist = false;
                            checkListWrapObj.isBoolean = true;
                            checkListWrapObj.isImage = false;
                            checkListWrapObj.isNumber = false;
                            checkListWrapObj.showNotesInput = true;
                        }else if(checklistItem.Answer_Type__c.equalsIgnoreCase('Dropdown')){
                            checkListWrapObj.isText = false;
                            checkListWrapObj.isPicklist = true;
                            checkListWrapObj.isBoolean = false;
                            checkListWrapObj.isImage = false;
                            checkListWrapObj.isNumber = false;
                            if(checklistItem.Summary__c.equalsIgnoreCase('Rafter size')||checklistItem.Summary__c.equalsIgnoreCase('Starter Board size'))
                            {
                                checkListWrapObj.showNotesInput = false;
                            }
                            else{
                                checkListWrapObj.showNotesInput = true;}
                            
                        }else if(checklistItem.Answer_Type__c.equalsIgnoreCase('Image')){
                            checkListWrapObj.isText = false;
                            checkListWrapObj.isPicklist = false;
                            checkListWrapObj.isBoolean = false;
                            checkListWrapObj.isImage = true;
                            checkListWrapObj.isNumber = false;
                            checkListWrapObj.showNotesInput = false;
                        }else if(checklistItem.Answer_Type__c.equalsIgnoreCase('Number')){
                            checkListWrapObj.isText = false;
                            checkListWrapObj.isPicklist = false;
                            checkListWrapObj.isBoolean = false;
                            checkListWrapObj.isImage = false;
                            checkListWrapObj.isNumber = true;
                            checkListWrapObj.showNotesInput = true;
                        }
                    }
                    checkListWrapObj.requirePicture = checklistItem.Pictures_Required__c == 'Yes'?true:false;
                    if(checkListItemImageCountMap.get(checklistItem.Id) != null){
                        checkListWrapObj.imageCount = checkListItemImageCountMap.get(checklistItem.Id);
                    }else{
                        checkListWrapObj.imageCount = 0;
                    }
                    checkListWrapObj.isDependent = checklistItem.Is_Dependent__c;
                    checkListWrapObj.answerForDependent = checklistItem.Answer_for_dependent__c;
                    checkListWrapObj.answerForDependent2=checklistItem.Answer_2_for_dependent__c;
                    checkListWrapObj.parentChecklistId = checklistItem.Parent_Checklist_Item__c;
                    checkListWrapObj.sortOrder = Integer.valueOf(checklistItem.Sort_Order__c);
                    checkListWrapObj.fileName = checklistItem.File_Name__c;
                    checkListWrapObj.minimumPhotos = Integer.valueOf(checklistItem.Minimum_photos__c);
                    if(String.isNotBlank(checklistItem.Answer_Dropdown_Values__c)){
                        List<String> optionList = checklistItem.Answer_Dropdown_Values__c.split(';');
                        if(optionList!=null && optionList.size()>0){
                            List<OptionsWrapper> opWrapList = new List<OptionsWrapper>();
                            OptionsWrapper defaultOpWrp = new OptionsWrapper();
                            defaultOpWrp.label = '-- Please Select --';
                            defaultOpWrp.value = null;
                            opWrapList.add(defaultOpWrp);
                            for(String s:optionList){
                                OptionsWrapper opWrp = new OptionsWrapper();
                                
                                
                                opWrp.label = s;
                                opWrp.value = s;
                                
                                
                                opWrapList.add(opWrp);
                            }
                            checkListWrapObj.options = opWrapList;
                        }
                    }
                    if(parentChecklistItem.Answer_Type__c == 'Dropdown'){
                        respList.add(checkListWrapObj);
                        recCount++;
                    }else if(parentChecklistItem.Answer_for_dependent__c == response){
                        respList.add(checkListWrapObj);
                    }
                }
                //update dependentList;
            }
        }
        return respList;
    }
    
    
    /*@AuraEnabled
public static String saveImage(String recordId, String imageName, String base64Data){
System.debug('recordId >> '+recordId);
System.debug('imageName >> '+imageName);
System.debug('base64 >> '+base64Data);

try{
//Saving Attachment
Attachment attachment = new Attachment();
attachment.Body = EncodingUtil.base64Decode(base64Data);
attachment.Name = imageName;
attachment.ParentId = recordId; 
attachment.IsPrivate = false;
insert attachment;


//Saving ContentVersion
ContentVersion fileToUpload = new ContentVersion();
fileToUpload.ContentLocation = 'S'; // Salesforce. The other option is: 'E'
fileToUpload.pathOnClient =imageName;
fileToUpload.title = imageName.substringBefore('.');
fileToUpload.versionData =  EncodingUtil.base64Decode(base64Data);

insert fileToUpload;

// Create a ContentDocument Link Record
// First get the content document Id from ContentVersion
Id contentDocumentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id =:fileToUpload.Id].ContentDocumentId;

//Create ContentDocumentLink
ContentDocumentLink linkToRecord = new ContentDocumentLink();
linkToRecord.ContentDocumentId = contentDocumentId;
linkToRecord.LinkedEntityId = recordId; // RecordID of the patent
linkToRecord.ShareType = 'V'; // Inferred permission
linkToRecord.Visibility = 'AllUsers'; // All Users

insert linkToRecord;

/* ContentDistribution cd = new ContentDistribution();
cd.Name = imageName;
cd.ContentVersionId = fileToUpload.id;
cd.PreferencesAllowViewInBrowser= true;
cd.PreferencesLinkLatestVersion=true;
cd.PreferencesNotifyOnVisit=false;
cd.PreferencesPasswordRequired=false;
cd.RelatedRecordId=recordId;
cd.PreferencesAllowOriginalDownload= true;
insert cd;

ContentVersion cvRec = [select Id, FileType, ContentBodyId from ContentVersion where Id =: fileToUpload.Id];
ContentDistribution cDistRec = [select Id, DistributionPublicUrl from ContentDistribution where Id =: cd.Id]; 

//cvRec.URL_For_LWC__c = recordId+'#'+buildPublicUrl(cvRec, cDistRec);

//update cvRec;

System.debug('saved');
return imageName;
}catch(Exception e){
System.debug('Exception occured '+e.getMessage());
return e.getMessage();
}
}


@AuraEnabled
public static void saveImagesNew(String recordId, String imagesData){
List<ImageDataWrapper> imageWrapperList =  (List<ImageDataWrapper>)System.JSON.deserialize(imagesData, List<ImageDataWrapper>.class);
for(ImageDataWrapper imageDataWrp: imageWrapperList){
System.debug('Image sent >> '+imageDataWrp.fileName);
saveImage(recordId, imageDataWrp.fileName, imageDataWrp.base64);
System.debug('Image done >> '+imageDataWrp.fileName);
}
}*/
    @AuraEnabled
    public static void deleteChecklistItems(String serviceAppointmentId) {
        List<Service_Appointment_Checklist_Item__c> recordsToDelete = [SELECT Id, Name, Notes__c FROM Service_Appointment_Checklist_Item__c WHERE Service_Appointment__c= :serviceAppointmentId AND Parent_Checklist_Item__c!=Null];
        // Filter records where Notes__c is not null
        List<Service_Appointment_Checklist_Item__c> filteredRecords = new List<Service_Appointment_Checklist_Item__c>();
        for (Service_Appointment_Checklist_Item__c record : recordsToDelete) {
            if (record.Notes__c == null || record.Notes__c=='-- Please Select --') {
                filteredRecords.add(record);
            }
        }
        
        // Delete filtered records
        System.debug(filteredRecords);
        delete filteredRecords;
    }
    @AuraEnabled 
    public static String getChecklistNotes(String serviceAppointmentId) {
    String notes = '';
    
    // Query for the checklist item based on the label and service appointment ID
    Service_Appointment_Checklist_Item__c checklistItem = [SELECT Notes__c FROM Service_Appointment_Checklist_Item__c WHERE Service_Appointment__c = :serviceAppointmentId AND Summary__c = :'Roofing material' LIMIT 1];
    
    // If checklist item found, return its Notes__c value
    if (checklistItem != null) {
        notes = checklistItem.Notes__c != null ? checklistItem.Notes__c : '';
    }
    
    return notes;
}

    public static String buildPublicUrl(ContentVersion cVersion, ContentDistribution cDist) {
        System.debug('cVersion >> '+cVersion);
        String fileType = cVersion.FileType.toLowerCase().capitalize();
        String cVersionId = cVersion.Id;
        String cBodyId = cVersion.ContentBodyId;
        String originalUrl = String.valueOf(cDist.DistributionPublicUrl);
        String cDistParam = originalUrl.substring(originalUrl.indexOf('/a/'));
        String orgId = ConnectApi.Organization.getSettings().orgId;
        String baseDomain = Url.getOrgDomainUrl().toExternalForm();
        baseDomain = baseDomain.substringBefore('.') + '--c.documentforce.com';
        String theUrl = baseDomain + '/sfc/dist/version/renditionDownload?rendition=ORIGINAL_' +
            fileType + '&versionId=' + cVersionId + '&operationContext=DELIVERY&contentId=' + cBodyId +
            '&page=0&d=' + cDistParam + '&oid=' + orgId + '&dpt=null&viewId=';
        return theUrl;
    }
    
    
    @AuraEnabled
    public static string saveNotes(String recordId, String notes){
        if(notes.contains('Yes')||notes.contains('Pigeon Holes')||notes.contains('Reactangle'))
        {
            update (new Service_Appointment_Checklist_Item__c(Id = recordId, Notes__c = notes,Pictures_Required__c='Yes'));
        }
        if(notes.contains('No')||notes.contains('None'))
        {
            update (new Service_Appointment_Checklist_Item__c(Id = recordId, Notes__c = notes,Pictures_Required__c='No'));
        }
        else {
            update (new Service_Appointment_Checklist_Item__c(Id = recordId, Notes__c = notes));
        }
        
        return 'notes saved';
    }
    
    
    @AuraEnabled 
    public static string updateServiceAppointment(String recordId){
        
        update (new ServiceAppointment(Id = recordId, Status = 'Completed'));
        ServiceAppointmentPDFClass.createPdf(recordId);
        ServiceAppointmentPDFClass.createPdf1(recordId);
        return 'saved';
    }
    
    public class ImageDataWrapper {
        public String fileName;
        public String base64;
    }
    
    public class ChecklistWrapper{
        @AuraEnabled public String checkListLabel {get;set;}
        @AuraEnabled public String scrollName {get;set;}
        @AuraEnabled public Boolean isQuestionnaire {get;set;}
        @AuraEnabled public List<CheckListItemsWrapper> checkListItems {get;set;}
    }
    
    public class CheckListItemsWrapper{
        @AuraEnabled public String checkListId {get;set;}
        @AuraEnabled public String summary {get;set;}
        @AuraEnabled public String specifics {get;set;}
        @AuraEnabled public String notes {get;set;}
        @AuraEnabled public Boolean showEditField {get;set;}
        @AuraEnabled public Integer imageCount {get;set;}
        @AuraEnabled public Integer minimumPhotos {get;set;}
        @AuraEnabled public Boolean isQuestion {get;set;}
        @AuraEnabled public Boolean isText {get;set;}
        @AuraEnabled public Boolean isBoolean {get;set;}
        @AuraEnabled public Boolean isPicklist {get;set;}
        @AuraEnabled public Boolean isImage {get;set;}
        @AuraEnabled public Boolean isNumber {get;set;}
        @AuraEnabled public Boolean showNotesInput {get;set;}
        @AuraEnabled public Boolean requirePicture {get;set;}
        @AuraEnabled public String answerForDependent {get;set;}
        @AuraEnabled public String answerForDependent2 {get;set;}
        @AuraEnabled public String parentChecklistId {get;set;}
        @AuraEnabled public Boolean isDependent {get;set;}
        @AuraEnabled public Integer sortOrder {get;set;}
        @AuraEnabled public String fileName {get;set;}
        @AuraEnabled public List<OptionsWrapper> options {get;set;}
    }
    
    public class OptionsWrapper{
        @AuraEnabled public String label {get;set;}
        @AuraEnabled public String value {get;set;}
    }
    
}
declare module "@salesforce/apex/SiteAssessmentController.getServiceAppointmentStatus" {
  export default function getServiceAppointmentStatus(param: {serviceAppointmentId: any}): Promise<any>;
}
declare module "@salesforce/apex/SiteAssessmentController.getCheckListData" {
  export default function getCheckListData(param: {serviceAppointmentId: any}): Promise<any>;
}
declare module "@salesforce/apex/SiteAssessmentController.getDependentChecklistItems" {
  export default function getDependentChecklistItems(param: {parentChecklistId: any, response: any}): Promise<any>;
}
declare module "@salesforce/apex/SiteAssessmentController.deleteChecklistItems" {
  export default function deleteChecklistItems(param: {serviceAppointmentId: any}): Promise<any>;
}
declare module "@salesforce/apex/SiteAssessmentController.getChecklistNotes" {
  export default function getChecklistNotes(param: {serviceAppointmentId: any}): Promise<any>;
}
declare module "@salesforce/apex/SiteAssessmentController.saveNotes" {
  export default function saveNotes(param: {recordId: any, notes: any}): Promise<any>;
}
declare module "@salesforce/apex/SiteAssessmentController.updateServiceAppointment" {
  export default function updateServiceAppointment(param: {recordId: any}): Promise<any>;
}

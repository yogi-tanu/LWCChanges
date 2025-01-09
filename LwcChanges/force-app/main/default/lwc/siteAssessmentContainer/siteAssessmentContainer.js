import { LightningElement, api } from 'lwc';
import { CloseActionScreenEvent } from 'lightning/actions';

export default class SiteAssessmentContainer extends LightningElement {

    startAssessment = false;
    submitted = false;
    @api recordId;

    handleStartAssessment(){
        this.startAssessment = true;
    }

    handleSubmitContainer(event){
        this.startAssessment = false;
        this.submitted = true;
    }
}
import { LightningElement, api, track } from 'lwc';

const MAX_FILE_SIZE = 3145728;

export default class ImageUploader extends LightningElement {

    /* myRecordId = 'a6Z7e000000oSA7EAM';

    get acceptedFormats() {
        return ['.jpg', '.png'];
    }

    handleUploadFinished(event) {
        // Get the list of uploaded files
        const uploadedFiles = event.detail.files;
        alert('No. of files uploaded : ' + uploadedFiles.length);
    } */

    imageSequence = 1;
   
    @api label;
    @api checkListItem;
    @api fileName;
    @api sortOrder;
    @track images = [];
    @track filesToBeUploaded = [];
    error;

    async handleFileChange(event) {
        this.filesToBeUploaded = await Promise.all(
            [...event.target.files].map(file => this.readFile(file))
        );

        console.log('this.filesToBeUploaded >> '+JSON.stringify(this.filesToBeUploaded));

        if(this.filesToBeUploaded.length){
            this.filesToBeUploaded.forEach(aFile => {
                this.images.push('data:image/png;base64, '+aFile.base64);
            })
        }
    }

    readFile(fileSource) {
        return new Promise((resolve, reject) => {
            let img = new Image();
            let imageName = '';
            let base64 = '';
            img.onload = () => {
                let canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                canvas.width = width;
                canvas.height = height;
                let ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                let compressedImage = canvas.toDataURL('image/jpeg', 0.2);
                this.statusMessage = 'Compression complete';
                base64 = compressedImage.split(',')[1];
                console.log('this.sortOrder >> '+this.sortOrder);
                console.log('this.fileName >> '+this.fileName);
                
                if(this.sortOrder && this.fileName){
                    imageName = this.fileName+'_'+this.sortOrder+'_'+this.imageSequence+'.jpg';
                    this.imageSequence++;
                }else{
                    imageName = fileSource.name;
                }

                console.log('imageName >> '+imageName);
                this.loading = true;
                resolve({ fileName:imageName, base64:base64});
            }
            img.src = URL.createObjectURL(fileSource);
        });
    }

    compressFile(img){
        let canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(img.src, 0, 0, width, height);
        let compressedImage = canvas.toDataURL('image/jpeg', 0.2);
        this.statusMessage = 'Compression complete';
        var base64 = compressedImage.split(',')[1];
        return base64;
    }

    handleUploadFile(event){
        //let allFiles = event.target.files;
        const file = event.target.files[0];
        //let recId = event.target.getAttribute('data-id');
        let img = new Image();
        let imageName = '';
        img.onload = () => {
            let canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            canvas.width = width;
            canvas.height = height;
            let ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            let compressedImage = canvas.toDataURL('image/jpeg', 0.2);
            this.statusMessage = 'Compression complete';
            var base64 = compressedImage.split(',')[1];
            console.log('this.sortOrder >> '+this.sortOrder);
            console.log('this.fileName >> '+this.fileName);
            if(this.sortOrder && this.fileName){
                imageName = this.fileName+'_'+this.sortOrder+'_'+this.imageSequence+'.jpg';
                this.imageSequence++;
            }else{
                imageName = file.name;
            }
            this.loading = true;
            this.filesToBeUploaded.push({
                imageName : imageName,
                base64Data : base64
            })

        }
        img.src = URL.createObjectURL(file);
        this.images.push(img.src);
        this.statusMessage = 'Compression started.'
    }

    clearPreviousSelection(){
        console.log("running clearPreviousSelection");
        this.template.querySelector('form').reset();
        let selInput = this.template.querySelector('[data-name="sel"]');
        selInput.value = null;
    }

    handleUpload(){
        this.dispatchEvent(new CustomEvent('uploadimages', {
            detail: {
                "label" : this.label,
                "checkListItem" : this.checkListItem,
                "images" : this.filesToBeUploaded
            }
        }));
    }

    handleCancel(){
        this.dispatchEvent(new CustomEvent('cancelclick'));
    }
}
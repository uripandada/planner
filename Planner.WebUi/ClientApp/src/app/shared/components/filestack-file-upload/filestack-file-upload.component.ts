import { Component, OnInit, Input, EventEmitter, Output, ViewChild, ElementRef, Inject, Optional, OnChanges, SimpleChanges } from '@angular/core';
import { AuthorizeService, IUser } from '../../../../api-authorization/authorize.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { API_BASE_URL } from '../../../core/autogenerated-clients/api-client';
import { map } from 'rxjs/operators';
import { FilestackService } from '@filestack/angular';
import { Client, InputFile, PickerOptions, StoreUploadOptions, TransformOptions, UploadOptions } from 'filestack-js';
import { FilestackFileUploadItemData } from './filestack-file-upload-item-data';

@Component({
  selector: 'app-filestack-file-upload',
  templateUrl: './filestack-file-upload.component.html'
})
export class FilestackFileUploadComponent implements OnInit, OnChanges {

  @Input() isMultiUpload: boolean = true;
  @Input() hotelGroupId: string = "";
  @Input() fileUploadTag: string = "";
  @Input() fileUrls: string[] = [];

  @Output() filesChanged: EventEmitter<string[]> = new EventEmitter<string[]>();

  uploadedFiles$: BehaviorSubject<FilestackFileUploadItemData[]> = new BehaviorSubject<FilestackFileUploadItemData[]>([]);
  uploadingFiles$: BehaviorSubject<FilestackFileUploadItemData[]> = new BehaviorSubject<FilestackFileUploadItemData[]>([]);
  isUploadInProgress$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  hideUploadButton$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private filestackService: FilestackService) {
  }

  ngOnInit() {
    this.uploadedFiles$.next(this.fileUrls.map(url => new FilestackFileUploadItemData(url, true, 100)));
    this.hideUploadButton$.next(!this.isMultiUpload && this.uploadedFiles$.value.length > 0);
  }

  ngOnChanges(changes: SimpleChanges): void {

  }

  uploadSelectedFiles(files: FileList) {
    if (!files || files.length === 0)
      return;

    if (this.isUploadInProgress$.value) {
      return;
    }

    this.hideUploadButton$.next(true);
    this.isUploadInProgress$.next(true);

    let filesToUpload = [];
    let temporaryFileUrls = [];
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      let file = files.item(fileIndex);
      filesToUpload.push(file);

      temporaryFileUrls.push(URL.createObjectURL(file));
    }

    this.uploadingFiles$.next(temporaryFileUrls.map(temporaryUrl => new FilestackFileUploadItemData(temporaryUrl, false, 0)));

    let uploadTags: any = {};
    if (!!this.hotelGroupId) {
      uploadTags.hotelGroupId = this.hotelGroupId;
    }
    else {
      uploadTags.hotelGroupId = "UNKNOWN";
    }

    if (!!this.fileUploadTag) {
      uploadTags.type = this.fileUploadTag;
    }
    else {
      uploadTags.type = "UNGROUPED"
    }

    let uploadOptions: UploadOptions = {
      onProgress: (event) => { this.uploadProgressChanged(event, this); },
      tags: uploadTags,
    };

    this.filestackService.upload(filesToUpload, uploadOptions)
      .subscribe(
        (uploadResponse: any[]) => {
          let uploadedFiles: FilestackFileUploadItemData[] = [...this.uploadedFiles$.value];

          for (let fileUploadResponse of uploadResponse) {
            let handle: string = fileUploadResponse.handle;
            let status: string = fileUploadResponse.status;
            let url: string = fileUploadResponse.url;

            uploadedFiles.push(new FilestackFileUploadItemData(url, true, 100));
          }

          this.uploadingFiles$.next([]);
          this.uploadedFiles$.next(uploadedFiles);

          this.filesChanged.next(uploadedFiles.map(uf => uf.fileUrl));
        },
        (error: Error) => {
          this.hideUploadButton$.next(!this.isMultiUpload && this.uploadedFiles$.value.length > 0);
        },
        () => {
          this.hideUploadButton$.next(!this.isMultiUpload && this.uploadedFiles$.value.length > 0);
          this.isUploadInProgress$.next(false);
        }
    );
  }

  onFileRemoved(fileUrl: string) {
    let uploadedFiles = [...this.uploadedFiles$.value];
    let fileIndex = uploadedFiles.findIndex(uf => uf.fileUrl === fileUrl);
    if (fileIndex >= 0) {
      uploadedFiles.splice(fileIndex, 1);

      this.uploadedFiles$.next(uploadedFiles);
      this.filesChanged.next(uploadedFiles.map(uf => uf.fileUrl));
      this.hideUploadButton$.next(!this.isMultiUpload && this.uploadedFiles$.value.length > 0);
    }
  }

  uploadProgressChanged(event: any, that: any) {
    // event.files - list of files that are being uploaded
    // event.files[i].totalBytes - uploaded bytes of a file
    // event.files[i].totalPercent - percent uploaded for a file
    // event.totalBytes - total uploaded bytes for all files
    // event.totalPercent - total uploaded percent of all files

    let uploadingFiles = that.uploadingFiles$.value;
    let ufs = [];
    for (let f of uploadingFiles) {
      f.fileUploadProgress = event.totalPercent;
      ufs.push(f);
    }
    that.uploadingFiles$.next(ufs);
  }
}

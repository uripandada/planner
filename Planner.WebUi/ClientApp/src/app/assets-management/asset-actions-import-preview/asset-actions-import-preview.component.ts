import { HttpClient, HttpEvent } from '@angular/common/http';
import { Component, ElementRef, Inject, OnInit, Optional, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { API_BASE_URL, ImportPreviewAssetClient, ImportAssetActionsPreview, ImportAssetsPreview, SaveImportPreviewAssetsCommand, ImportAssetPreview, ProcessResponseOfIEnumerableOfSaveAssetImportResult, SaveImportPreviewAssetActionsCommand, ImportAssetActionPreview, ProcessResponseOfIEnumerableOfSaveAssetActionImportResult } from '../../core/autogenerated-clients/api-client';

@Component({
  selector: 'app-asset-actions-import-preview',
  templateUrl: './asset-actions-import-preview.component.html',
  styleUrls: ['./asset-actions-import-preview.component.scss']
})
export class AssetActionsImportPreviewComponent implements OnInit {
  @ViewChild('fileUpload') fileUpload: ElementRef;

  private _httpClient: HttpClient;

  fileName$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  assetActionsImportPreview$: BehaviorSubject<ImportAssetActionsPreview> = new BehaviorSubject<ImportAssetActionsPreview>(new ImportAssetActionsPreview({ hasError: false, fileName: '', message: '', assetActions: [], }));

  isDataPreviewGenerated$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isDataPreviewErrorFree$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private _importAssetsClient: ImportPreviewAssetClient,
    private _router: Router,
    private _toastr: ToastrService,
    @Inject(HttpClient) httpClient: HttpClient,
    @Optional() @Inject(API_BASE_URL) baseUrl?: string
  ) {
    this._httpClient = httpClient;
  }

  ngOnInit(): void {
  }

  cancelImport() {
    this._router.navigate(['assets-management']);
  }

  onFileSelected(event) {
    if (event.target.files.length > 0) {
      this.isLoading$.next(true);

      const file: File = event.target.files[0];
      this.fileName$.next(file.name);

      if (file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && file.type !== "application/vnd.ms-excel") {
        this._toastr.warning("Only CSV file types are supported for import.");
        return;
      }

      const formData: FormData = new FormData();
      formData.append(`file`, file);

      this._httpClient.post<any>(`/api/importpreviewasset/uploadassetactionsfromfile`, formData).subscribe(
        (response: ImportAssetActionsPreview) => {
          if (file !== null) {
            this.isDataPreviewGenerated$.next(true);
          }

          this.assetActionsImportPreview$.next(response);

          if (response.hasError) {
            this._toastr.error(response.message);
            this.isDataPreviewErrorFree$.next(false);
          }
          else {

            let isDataPreviewErrorFree = true;
            for (let u of response.assetActions) {
              if (u.hasError) {
                isDataPreviewErrorFree = false;
                break;
              }
            }

            if (isDataPreviewErrorFree) {
              this.isDataPreviewErrorFree$.next(true);
              this._toastr.success(response.message);
            }
            else {
              this.isDataPreviewErrorFree$.next(false);
              this._toastr.info(response.message);
              this._toastr.warning("Problems detected with some asset actions. Please fix them and re-import the file.");
            }
          }

          this.fileUpload.nativeElement.value = "";
          this.isLoading$.next(false);
        }
      );
    }
  }

  save() {
    if (this.isDataPreviewGenerated$.value && this.isDataPreviewErrorFree$.value) {
      this.isLoading$.next(true);

      let command = new SaveImportPreviewAssetActionsCommand({
        assetActions: this.assetActionsImportPreview$.value.assetActions.map(u => new ImportAssetActionPreview({
          hasError: u.hasError,
          action: u.action,
          asset: u.asset,
          credits: u.credits,
          message: u.message,
          price: u.price,
          priority: u.priority,
          type: u.type,
        })),
      });

      this._importAssetsClient.saveAssetActions(command).subscribe(
        (response: ProcessResponseOfIEnumerableOfSaveAssetActionImportResult) => {
          if (response.hasError) {
            this._toastr.error(response.message);

            let importAssetsPreview = new ImportAssetActionsPreview(this.assetActionsImportPreview$.value);
            let assetActions = [...importAssetsPreview.assetActions];
            for (let ui of response.data) {
              if (ui.hasError) {
                let importUserPreview = assetActions.find(u => u.asset === ui.asset);
                importUserPreview.hasError = true;
                importUserPreview.message = ui.message;
              }
            }

            importAssetsPreview.assetActions = assetActions;
            this.assetActionsImportPreview$.next(importAssetsPreview);
            this.isDataPreviewErrorFree$.next(false);
          }
          else {
            this._router.navigate(['assets-management']).then(() => {
              this._toastr.success(response.message);
            });
          }
        },
        (error: Error) => { this._toastr.error(error.message); this.isLoading$.next(false); },
        () => { this.isLoading$.next(false); }
      );
    }
  }
}

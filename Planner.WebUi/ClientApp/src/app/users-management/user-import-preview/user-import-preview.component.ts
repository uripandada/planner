import { HttpClient, HttpEvent } from '@angular/common/http';
import { Component, ElementRef, Inject, OnInit, Optional, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { API_BASE_URL, ImportPreviewUserClient, ImportUserPreview, ImportUsersPreview, ProcessResponse, ProcessResponseOfIEnumerableOfSaveUserImportResult, SaveImportPreviewUsersCommand } from '../../core/autogenerated-clients/api-client';
import { ColorService } from '../../core/services/color.service';

@Component({
  selector: 'app-user-import-preview',
  templateUrl: './user-import-preview.component.html',
  styleUrls: ['./user-import-preview.component.css']
})
export class UserImportPreviewComponent implements OnInit {
  @ViewChild('fileUpload') fileUpload: ElementRef;

  private _httpClient: HttpClient;

  fileName$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  userImportPreview$: BehaviorSubject<ImportUsersPreview> = new BehaviorSubject<ImportUsersPreview>(new ImportUsersPreview({ hasError: false, fileName: '', message: '', users: [], }));

  isDataPreviewGenerated$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isDataPreviewErrorFree$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private _importPreviewClient: ImportPreviewUserClient,
    private _colorService: ColorService,
    private _router: Router,
    private _toastr: ToastrService,
    @Inject(HttpClient) httpClient: HttpClient,
    @Optional() @Inject(API_BASE_URL) baseUrl?: string) {
    this._httpClient = httpClient;
  }

  ngOnInit(): void {
  }

  cancelImport() {
    this._router.navigate(['users-management']);
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

      this._httpClient.post<any>(`/api/importpreviewuser/uploadusersfromfile`, formData).subscribe(
        (response: ImportUsersPreview) => {

          if (file !== null) {
            this.isDataPreviewGenerated$.next(true);
          }

          this.userImportPreview$.next(response);

          if (response.hasError) {
            this._toastr.error(response.message);
            this.isDataPreviewErrorFree$.next(false);
          }
          else {

            let isDataPreviewErrorFree = true;
            for (let u of response.users) {
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
              this._toastr.warning("Problems detected with some users. Please fix them and re-import the file.");
            }
          }

          this.fileUpload.nativeElement.value = "";
          this.isLoading$.next(false);
        },
        (error: Error) => { this._toastr.error(error.message); this.isLoading$.next(false); },
        () => { this.isLoading$.next(false); }
      );
    }
    else {
      this._toastr.warning("No import files selected.");
    }
  }

  saveUsers() {
    if (this.isDataPreviewGenerated$.value && this.isDataPreviewErrorFree$.value) {
      this.isLoading$.next(true);

      let command = new SaveImportPreviewUsersCommand({
        users: this.userImportPreview$.value.users.map(u => new ImportUserPreview({
          alreadyExists: u.alreadyExists,
          hasError: u.hasError,
          isUserGroupLeader: u.isUserGroupLeader,
          isUserSubGroupLeader: u.isUserSubGroupLeader,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          message: u.message,
          password: u.password,
          phone: u.phone,
          roleName: u.roleName,
          userGroup: u.userGroup,
          userName: u.userName,
          userSubGroup: u.userSubGroup,
          defaultAvatarColorHex: this._colorService.GenerateRandomPastelColorHex(),
          accessibleHotels: u.accessibleHotels,
        })),
      });

      this._importPreviewClient.saveUsers(command).subscribe(
        (response: ProcessResponseOfIEnumerableOfSaveUserImportResult) => {
          if (response.hasError) {
            this._toastr.error(response.message);

            let importUsersPreview = new ImportUsersPreview(this.userImportPreview$.value);
            let users = [...importUsersPreview.users];
            for (let ui of response.data) {
              if (ui.hasErrors) {
                let importUserPreview = users.find(u => u.userName === ui.userName);
                importUserPreview.hasError = true;
                importUserPreview.message = ui.message;
              }
            }
            importUsersPreview.users = users;
            this.userImportPreview$.next(importUsersPreview);
            this.isDataPreviewErrorFree$.next(false);
          }
          else {
            this._router.navigate(['users-management']).then(() => {
              this._toastr.success(response.message);
            });
          }
        },
        (error: Error) => { this._toastr.error(error.message); },
        () => { this.isLoading$.next(false); }
      );
    }
  }
}

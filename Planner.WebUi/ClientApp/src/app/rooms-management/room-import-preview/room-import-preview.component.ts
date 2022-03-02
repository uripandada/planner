import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, Inject, OnInit, Optional, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { API_BASE_URL, ImportPreviewRoomClient, ImportRoomPreview, ImportRoomsPreview, ProcessResponseOfIEnumerableOfSaveRoomImportResult, SaveImportPreviewRoomsCommand } from '../../core/autogenerated-clients/api-client';

@Component({
  selector: 'app-room-import-preview',
  templateUrl: './room-import-preview.component.html',
  styleUrls: ['./room-import-preview.component.css']
})
export class RoomImportPreviewComponent implements OnInit {
  @ViewChild('fileUpload') fileUpload: ElementRef;

  private _httpClient: HttpClient;

  fileName$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  roomImportPreview$: BehaviorSubject<ImportRoomsPreview> = new BehaviorSubject<ImportRoomsPreview>(new ImportRoomsPreview({ hasError: false, fileName: '', message: '', rooms: [] }));

  isDataPreviewGenerated$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isDataPreviewErrorFree$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private _importRoomsClient: ImportPreviewRoomClient,
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
    this._router.navigate(['rooms-management']);
  }

  onFileSelected(event) {
    if (event.target.files.length > 0) {
      this.isLoading$.next(true);

      const file: File = event.target.files[0];
      this.fileName$.next(file.name);

      if (file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && file.type !== "application/vnd.ms-excel") {
        this._toastr.warning("Only CSV files are supported for import.");
        this.isLoading$.next(false);
        return;
      }

      const formData: FormData = new FormData();
      formData.append(`file`, file);

      this._httpClient.post<any>(`/api/importpreviewroom/uploadroomsfromfile`, formData).subscribe(
        (response: ImportRoomsPreview) => {

          if (file !== null) {
            this.isDataPreviewGenerated$.next(true);
          }

          this.roomImportPreview$.next(response);

          if (response.hasError) {
            this._toastr.error(response.message);
            this.isDataPreviewErrorFree$.next(false);
          }
          else {

            let isDataPreviewErrorFree = true;
            for (let u of response.rooms) {
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
              this._toastr.warning("Problems detected with some rooms. Please fix them and re-import the file.");
            }
          }

          this.fileUpload.nativeElement.value = "";
          this.isLoading$.next(false);
        },
        (error: Error) => { this._toastr.error(error.message); this.isLoading$.next(false); },
        () => { this.isLoading$.next(false); }
      );
    }
  }

  saveRooms() {
    if (this.isDataPreviewGenerated$.value && this.isDataPreviewErrorFree$.value) {
      this.isLoading$.next(true);

      let command = new SaveImportPreviewRoomsCommand({
        rooms: this.roomImportPreview$.value.rooms.map(u => new ImportRoomPreview({
          alreadyExists: u.alreadyExists,
          hasError: u.hasError,
          beds: u.beds,
          order: u.order,
          area: u.area,
          building: u.building,
          floor: u.floor,
          floorSection: u.floorSection,
          floorSubSection: u.floorSubSection,
          hotel: u.hotel,
          message: u.message,
          roomCategory: u.roomCategory,
          roomName: u.roomName,
          roomType: u.roomType,
        })),
      });

      this._importRoomsClient.saveRooms(command).subscribe(
        (response: ProcessResponseOfIEnumerableOfSaveRoomImportResult) => {
          if (response.hasError) {
            this._toastr.error(response.message);

            let importRoomsPreview = new ImportRoomsPreview(this.roomImportPreview$.value);
            let rooms = [...importRoomsPreview.rooms];
            for (let roomSaveResult of response.data) {
              if (roomSaveResult.hasErrors) {
                let importUserPreview = rooms.find(r =>
                  r.roomName === roomSaveResult.roomName &&
                  r.building === roomSaveResult.building &&
                  r.floor === roomSaveResult.floor &&
                  r.hotel === roomSaveResult.hotel &&
                  r.area === roomSaveResult.area
                );
                importUserPreview.hasError = true;
                importUserPreview.message = roomSaveResult.message;
              }
            }
            importRoomsPreview.rooms = rooms;
            this.roomImportPreview$.next(importRoomsPreview);
            this.isDataPreviewErrorFree$.next(false);
          }
          else {
            this._router.navigate(['rooms-management']).then(() => {
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

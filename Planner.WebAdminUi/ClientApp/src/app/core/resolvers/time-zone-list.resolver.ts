import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { GetListOfWindowsTimeZonesQuery, HotelGroupClient, TimeZoneData } from '../autogenerated-clients/api-client';

@Injectable({ providedIn: 'root' })
export class TimeZoneListResolver implements Resolve<Observable<TimeZoneData[]>> {
  constructor(private _hotelGroupClient: HotelGroupClient) { }

  resolve(routeSnapshot: ActivatedRouteSnapshot) {
    return this._hotelGroupClient.getListOfWindowsTimeZones(new GetListOfWindowsTimeZonesQuery({}));
  }
}

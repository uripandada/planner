//import { Injectable } from '@angular/core';
//import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
//import { Observable } from 'rxjs';
//import { map } from 'rxjs/operators';
////import { GetListOfHotelsQuery, HotelClient, HotelItemData } from '../autogenerated-clients/api-client';
//import { HotelService } from '../services/hotel.service';

//@Injectable({ providedIn: 'root' })
//export class HotelListResolver implements Resolve<Observable<Array<HotelItemData>>> {
//  constructor(private hotelClient: HotelClient, private hotelService: HotelService) { }

//  resolve(routeSnapshot: ActivatedRouteSnapshot) {
//    return this.hotelClient.getList(new GetListOfHotelsQuery({})).pipe(
//      map(hotels => {
//        //this.hotelService.setHotels(hotels);

//        return [];
//      })
//    );
//  }
//}

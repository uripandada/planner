import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Resolve } from "@angular/router";
import { Observable } from "rxjs";
import { BuildingSimpleData, GetBuildingSimpleQuery, RoomManagementClient } from "../autogenerated-clients/api-client";

@Injectable({ providedIn: "root" })
export class BuildingSimpleDataResolver implements Resolve<Observable<BuildingSimpleData>> {
  constructor(private roomManagementClient: RoomManagementClient) { }

  resolve(routeSnapshot: ActivatedRouteSnapshot) {
    const buildingId: string = routeSnapshot.queryParams['buildingId'];
    return this.roomManagementClient.getBuildingSimple(new GetBuildingSimpleQuery({ id: buildingId }));
  }
}
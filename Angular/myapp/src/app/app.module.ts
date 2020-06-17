import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DxFileManagerModule } from "devextreme-angular";
import { DxTreeListModule } from "devextreme-angular";
@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    DxFileManagerModule,
    DxTreeListModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

<!-- default badges list -->
![](https://img.shields.io/endpoint?url=https://codecentral.devexpress.com/api/v1/VersionRange/273030974/20.1.3%2B)
[![](https://img.shields.io/badge/Open_in_DevExpress_Support_Center-FF7200?style=flat-square&logo=DevExpress&logoColor=white)](https://supportcenter.devexpress.com/ticket/details/T900608)
[![](https://img.shields.io/badge/📖_How_to_use_DevExpress_Examples-e9f6fc?style=flat-square)](https://docs.devexpress.com/GeneralInformation/403183)
<!-- default badges end -->
# TreeList - How to display and edit file system with the client-side RemoteFileSystemProvider

Commonly, providers from the [File Management](https://js.devexpress.com/Documentation/Guide/Common/Modularity/DevExtreme_Modules_Structure/#file_management) module are used with the [DevExtreme File Manager](https://js.devexpress.com/Documentation/ApiReference/UI_Widgets/dxFileManager/). However, the providers logic is decoupled from the FileManager UI widget. That is why you can use the providers with other client-side components too. 

This sample shows how to display and edit files and folders in [DevExtreme TreeList](https://js.devexpress.com/Documentation/ApiReference/UI_Widgets/dxTreeList/). TreeList gets its content via [RemoteFileSystemProvider](https://js.devexpress.com/Documentation/ApiReference/UI_Widgets/dxFileManager/File_System_Providers/Remote/).   

*Files to look at*:

* [app.component.html](./Angular/myapp/src/app/app.component.html)
* [app.component.ts](./Angular/myapp/src/app/app.component.ts)

# TreeList - How to display and edit file system with the client-side RemoteFileSystemProvider

Commonly, providers from the [File Management](https://js.devexpress.com/Documentation/Guide/Common/Modularity/DevExtreme_Modules_Structure/#file_management) module are used with the [DevExtreme File Manager](https://js.devexpress.com/Documentation/ApiReference/UI_Widgets/dxFileManager/). However, the providers logic is decoupled from the FileManager UI widget. That is why you can use the providers with other client-side components too. 

This sample shows how to display and edit files and folders in [DevExtreme TreeList](https://js.devexpress.com/Documentation/ApiReference/UI_Widgets/dxTreeList/). TreeList gets its content via [RemoteFileSystemProvider](https://js.devexpress.com/Documentation/ApiReference/UI_Widgets/dxFileManager/File_System_Providers/Remote/).   

*Files to look at*:

* [app.component.html](./Angular/myapp/src/app/app.component.html)
* [app.component.ts](./Angular/myapp/src/app/app.component.ts)

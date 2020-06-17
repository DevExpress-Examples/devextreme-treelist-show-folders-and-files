import { Component,ViewChild } from '@angular/core';
import { DxTreeListComponent } from "devextreme-angular";
import RemoteFileSystemProvider from "devextreme/file_management/remote_provider";
import FileSystemItem from "devextreme/file_management/file_system_item";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  dataSource: any;
  @ViewChild(DxTreeListComponent, { static: false })
  treeList: DxTreeListComponent;
  provider: RemoteFileSystemProvider;
  dragCopyMode: boolean;

  constructor() {
    const provider = new RemoteFileSystemProvider({
      endpointUrl:
        "https://js.devexpress.com/Demos/Mvc/api/file-manager-file-system-scripts"
    });
    this.provider = provider;

    this.dataSource = {
      key: "key",
      load: options => {
        const parentIds = options.parentIds || [""];
        const promises = parentIds.map(parentId => {
          const directory = new FileSystemItem(parentId, true);
          return provider.getItems(directory);
        });

        if (promises.length === 1) {
          return promises[0];
        }

        return Promise.all(promises).then(parts => {
          const result = [];
          return result.concat.apply(result, parts);
        });
      },
      insert: values => {
        const parentPath = values.parentId || "";
        const directory = new FileSystemItem(parentPath, true);
        return provider.createDirectory(directory, values.name);
      },
      update: (key, values) => {
        return this.findItemByKey(key).then(item =>
          provider.renameItem(item, values.name)
        );
      },
      remove: key => {
        return this.findItemByKey(key).then(
          item => provider.deleteItems([item])[0]
        );
      }
    };

    this.onDownloadButtonClick = this.onDownloadButtonClick.bind(this);
    this.onDragChange = this.onDragChange.bind(this);
    this.onReorder = this.onReorder.bind(this);
    this.onDragMove = this.onDragMove.bind(this);
  }

  findItemByKey(key) {
    return this.treeList.instance
      .byKey(key)
      .then(item => new FileSystemItem(key, item.isDirectory));
  }

  parentIdExpr(item, value) {
    if (value) {
      return (item.parentId = value);
    }
    return getParentPath(item.path);
  }

  customizeSizeText(e) {
    if (e.value !== null) {
      return Math.ceil(e.value / 1024) + " KB";
    }
  }

  getIconClassName(item) {
    const iconClass = "dx-icon-" + getIconName(item);
    return iconClass + " item-thumbnail-container";
  }

  isDownloadButtonVisible(e) {
    return !e.row.isEditing;
  }

  onDownloadButtonClick(e) {
    this.provider.downloadItems([e.row.data]);
    e.event.preventDefault();
  }

  onEditorPreparing(e) {
    if (e.parentType !== "dataRow") return;

    if (e.dataField !== "name") {
      e.editorOptions.disabled = true;
    }
  }

  onRowPrepared(e) {
    if (e.isNewRow || e.rowType !== "data") return;

    const className = e.data.isDirectory ? "directory-row" : "file-row";
    e.rowElement.className += ` ${className}`;
  }

  onToolbarPreparing(e) {
    var addRowButton = e.toolbarOptions.items.filter(
      item => item.name === "addRowButton"
    )[0];
    addRowButton.options.icon = "newfolder";
    addRowButton.options.hint = "Create directory";
  }

  onDataErrorOccurred(e) {
    e.error.message = "Access denied";
  }

  onDragChange(e) {
    const visibleRows = this.treeList.instance.getVisibleRows();
    const sourceNode = this.treeList.instance.getNodeByKey(e.itemData.key);
    let targetNode = visibleRows[e.toIndex].node;

    if (!targetNode.data.isDirectory) {
      e.cancel = true;
      return;
    }

    while (targetNode && targetNode.data) {
      if (targetNode.data.key === sourceNode.data.key) {
        e.cancel = true;
        return;
      }
      targetNode = targetNode.parent;
    }

    this.dragCopyMode = e.event.ctrlKey;
  }

  onReorder(e) {
    const visibleRows = e.component.getVisibleRows(),
      sourceData = e.itemData,
      targetData = visibleRows[e.toIndex].data;

    const destDirectory = e.dropInsideItem
      ? targetData
      : new FileSystemItem("", true);
    const editItemsFunc = this.dragCopyMode
      ? this.provider.copyItems
      : this.provider.moveItems;

    editItemsFunc
      .call(this.provider, [sourceData], destDirectory)[0]
      .then(() => this.treeList.instance.refresh());
  }

  onDragMove(e) {
    const element = document.body;
    const hasCopyMarker = element.classList.contains("drag-copy-mode");
    const copyMode = e.event.ctrlKey;
    if (copyMode !== hasCopyMarker) {
      element.classList.toggle("drag-copy-mode", copyMode);
    }
  }
}

function getIconName(item) {
  if (item.isDirectory) {
    return "folder";
  }
  switch (item.getFileExtension()) {
    case ".png":
    case ".gif":
    case ".jpg":
    case ".ico":
      return "image";
    default:
      return "doc";
  }
}

function getParentPath(path) {
  if (!path) {
    return "";
  }

  const index = path.lastIndexOf("/");
  return index !== -1 ? path.substr(0, index) : "";
}

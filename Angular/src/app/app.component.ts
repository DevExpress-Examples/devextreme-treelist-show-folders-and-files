import { Component, ViewChild } from '@angular/core';
import { DxTreeListComponent, DxTreeListModule, DxTreeListTypes } from 'devextreme-angular/ui/tree-list';
import CustomStore from 'devextreme/data/custom_store';
import { LoadOptions } from 'devextreme/data';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import {
  createFileSystemItem,
  getIconName,
  getParentPath,
  provider,
} from './file-system';

type FileItem = FileSystemItem & { parentId?: string };

@Component({
    selector: 'app-root',
    imports: [DxTreeListModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild(DxTreeListComponent, { static: false })
  treeList!: DxTreeListComponent;

  dataSource: CustomStore<FileItem, string>;

  remoteOperations = { filtering: true };

  dragCopyMode = false;

  getIconName = getIconName;

  constructor() {
    this.dataSource = new CustomStore<FileItem, string>({
      key: 'key',
      load: (options: LoadOptions<FileItem>) => {
        const parentIds: string[] = options.parentIds ?? [''];
        const promises = parentIds.map((parentId) => {
          const directory = createFileSystemItem(parentId, true);
          return provider.getItems(directory);
        });

        if (promises.length === 1) {
          return promises[0];
        }

        return Promise.all(promises).then((parts) => ([] as FileSystemItem[]).concat(...parts));
      },
      insert: (values: FileItem) => {
        const parentPath = values.parentId || '';
        const directory = createFileSystemItem(parentPath, true);
        return provider.createDirectory(directory, values.name) as Promise<FileItem>;
      },
      update: (key: string, values: FileItem) => this.findItemByKey(key)
        .then((item) => provider.renameItem(item, values.name)),
      remove: (key: string) => this.findItemByKey(key)
        .then((item) => provider.deleteItems([item])[0])
        .then(() => {}),
    });

    this.onDownloadButtonClick = this.onDownloadButtonClick.bind(this);
    this.onDragChange = this.onDragChange.bind(this);
    this.onReorder = this.onReorder.bind(this);
    this.onDragMove = this.onDragMove.bind(this);
  }

  findItemByKey(key: string): Promise<FileSystemItem> {
    return this.treeList.instance
      .byKey(key)
      .then((item: FileSystemItem) => createFileSystemItem(key, item.isDirectory));
  }

  parentIdExpr(item: { parentId?: string; path?: string }, value?: string): string {
    if (value) {
      item.parentId = value;
      return value;
    }
    return getParentPath(item.path ?? '');
  }

  customizeSizeText(e: { value?: number | null }): string {
    return e.value !== null && e.value !== undefined ? `${Math.ceil(e.value / 1024)} KB` : '';
  }

  isDownloadButtonVisible(e: { row?: DxTreeListTypes.Row }): boolean {
    return !e.row?.isEditing;
  }

  onDownloadButtonClick(e: DxTreeListTypes.ColumnButtonClickEvent): void {
    provider.downloadItems([e.row?.data]);
    e.event?.preventDefault();
  }

  onEditorPreparing(e: DxTreeListTypes.EditorPreparingEvent): void {
    if (e.parentType !== 'dataRow') {
      return;
    }

    if (e.dataField !== 'name') {
      e.editorOptions.disabled = true;
    }
  }

  onRowPrepared(e: DxTreeListTypes.RowPreparedEvent): void {
    if (e.isNewRow || e.rowType !== 'data') {
      return;
    }

    const className = e.data.isDirectory ? 'directory-row' : 'file-row';
    e.rowElement.classList.add(className);
  }

  onToolbarPreparing(e: DxTreeListTypes.ToolbarPreparingEvent): void {
    const items = (e.toolbarOptions.items ?? []) as {
      name?: string;
      options?: { icon?: string; hint?: string };
    }[];
    const addRowButton = items.filter((item) => item.name === 'addRowButton')[0];
    if (addRowButton?.options) {
      addRowButton.options.icon = 'newfolder';
      addRowButton.options.hint = 'Create directory';
    }
  }

  onDataErrorOccurred(e: DxTreeListTypes.DataErrorOccurredEvent): void {
    if (e.error) {
      e.error.message = 'Access denied';
    }
  }

  onDragChange(e: { itemData?: FileItem; toIndex: number; cancel?: boolean; event?: { ctrlKey?: boolean } }): void {
    const treeList = this.treeList.instance;
    if (!e.itemData) {
      return;
    }

    const visibleRows = treeList.getVisibleRows();
    const sourceNode = treeList.getNodeByKey(e.itemData.key);
    let targetNode: typeof sourceNode | undefined = visibleRows[e.toIndex].node;

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

    this.dragCopyMode = Boolean(e.event?.ctrlKey);
  }

  onReorder(e: { itemData?: FileItem; toIndex: number; dropInsideItem?: boolean }): void {
    const treeList = this.treeList.instance;
    if (!e.itemData) {
      return;
    }

    const visibleRows = treeList.getVisibleRows();
    const sourceData = e.itemData;
    const targetData = visibleRows[e.toIndex].data;

    const destDirectory = e.dropInsideItem ? targetData : createFileSystemItem('', true);
    const editItemsFunc = this.dragCopyMode ? provider.copyItems : provider.moveItems;

    editItemsFunc
      .call(provider, [sourceData], destDirectory)[0]
      .then(() => treeList.refresh());
  }

  onDragMove(e: { event?: { ctrlKey?: boolean } }): void {
    const element = document.body;
    const hasCopyMarker = element.classList.contains('drag-copy-mode');
    const copyMode = Boolean(e.event?.ctrlKey);
    if (copyMode !== hasCopyMarker) {
      element.classList.toggle('drag-copy-mode', copyMode);
    }
  }
}

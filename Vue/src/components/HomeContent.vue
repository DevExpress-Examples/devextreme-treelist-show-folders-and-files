<script setup lang="ts">
import { ref } from 'vue';

import 'devextreme/dist/css/dx.material.blue.light.compact.css';
import {
  DxButton,
  DxColumn,
  DxEditing,
  DxRowDragging,
  DxTreeList,
} from 'devextreme-vue/tree-list';
import CustomStore from 'devextreme/data/custom_store';
import type { LoadOptions } from 'devextreme/data';
import type FileSystemItem from 'devextreme/file_management/file_system_item';
import type {
  DataErrorOccurredEvent,
  EditorPreparingEvent,
  RowPreparedEvent,
  ToolbarPreparingEvent,
} from 'devextreme/ui/tree_list';
import {
  createFileSystemItem,
  getIconName,
  getParentPath,
  provider,
} from '../fileSystem';

type FileItem = FileSystemItem & { parentId?: string };

type RowDraggingProps = InstanceType<typeof DxRowDragging>['$props'];
type DragChangeEvent = Parameters<NonNullable<RowDraggingProps['onDragChange']>>[0];
type ReorderEvent = Parameters<NonNullable<RowDraggingProps['onReorder']>>[0];
type DragMoveEvent = Parameters<NonNullable<RowDraggingProps['onDragMove']>>[0];
type ButtonClickEvent = Parameters<NonNullable<InstanceType<typeof DxButton>['$props']['onClick']>>[0];

function isCopyMode(event: unknown): boolean {
  return Boolean((event as { ctrlKey?: boolean } | undefined)?.ctrlKey);
}

const treeListRef = ref<InstanceType<typeof DxTreeList>>();
const dragCopyMode = ref(false);

function getTreeListInstance() {
  return treeListRef.value?.instance;
}

async function findItemByKey(key: string): Promise<FileSystemItem> {
  const treeList = getTreeListInstance();
  if (!treeList) {
    throw new Error('TreeList is not initialized');
  }
  const item: FileSystemItem = await treeList.byKey(key);
  return createFileSystemItem(key, item.isDirectory);
}

const dataSource = new CustomStore<FileItem, string>({
  key: 'key',
  load(options: LoadOptions<FileItem>) {
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
  insert(values: FileItem) {
    const parentPath = values.parentId || '';
    const directory = createFileSystemItem(parentPath, true);
    return provider.createDirectory(directory, values.name) as Promise<FileItem>;
  },
  update(key: string, values: FileItem) {
    return findItemByKey(key).then((item) => provider.renameItem(item, values.name));
  },
  remove(key: string) {
    return findItemByKey(key).then((item) => provider.deleteItems([item])[0]).then(() => {});
  },
});

const remoteOperations = { filtering: true };

function parentIdExpr(item: { parentId?: string; path?: string }, value?: string): string {
  if (value) {
    item.parentId = value;
    return value;
  }
  return getParentPath(item.path ?? '');
}

function customizeSizeText(e: { value?: number | null }): string {
  return e.value !== null && e.value !== undefined ? `${Math.ceil(e.value / 1024)} KB` : '';
}

function isDownloadButtonVisible(e: { row?: { isEditing?: boolean } }): boolean {
  return !e.row?.isEditing;
}

function onDownloadButtonClick(e: ButtonClickEvent): void {
  provider.downloadItems([e.row?.data]);
  e.event?.preventDefault();
}

function onEditorPreparing(e: EditorPreparingEvent): void {
  if (e.parentType !== 'dataRow') {
    return;
  }

  if (e.dataField !== 'name') {
    e.editorOptions.disabled = true;
  }
}

function onRowPrepared(e: RowPreparedEvent): void {
  if (e.isNewRow || e.rowType !== 'data') {
    return;
  }

  const className = e.data.isDirectory ? 'directory-row' : 'file-row';
  e.rowElement.classList.add(className);
}

function onToolbarPreparing(e: ToolbarPreparingEvent): void {
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

function onDataErrorOccurred(e: DataErrorOccurredEvent): void {
  if (e.error) {
    e.error.message = 'Access denied';
  }
}

function onDragChange(e: DragChangeEvent): void {
  const treeList = getTreeListInstance();
  if (!treeList || !e.itemData) {
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

  dragCopyMode.value = isCopyMode(e.event);
}

function onReorder(e: ReorderEvent): void {
  const treeList = getTreeListInstance();
  if (!treeList || !e.itemData) {
    return;
  }

  const visibleRows = treeList.getVisibleRows();
  const sourceData = e.itemData;
  const targetData = visibleRows[e.toIndex].data;

  const destDirectory = e.dropInsideItem ? targetData : createFileSystemItem('', true);
  const editItemsFunc = dragCopyMode.value ? provider.copyItems : provider.moveItems;

  editItemsFunc
    .call(provider, [sourceData], destDirectory)[0]
    .then(() => treeList.refresh());
}

function onDragMove(e: DragMoveEvent): void {
  const element = document.body;
  const hasCopyMarker = element.classList.contains('drag-copy-mode');
  const copyMode = isCopyMode(e.event);
  if (copyMode !== hasCopyMarker) {
    element.classList.toggle('drag-copy-mode', copyMode);
  }
}
</script>
<template>
  <div>
    <DxTreeList
      ref="treeListRef"
      :data-source="dataSource"
      :show-borders="true"
      :remote-operations="remoteOperations"
      key-expr="key"
      :parent-id-expr="parentIdExpr"
      has-items-expr="isDirectory"
      root-value=""
      :focused-row-enabled="true"
      :height="500"
      @editor-preparing="onEditorPreparing"
      @row-prepared="onRowPrepared"
      @toolbar-preparing="onToolbarPreparing"
      @data-error-occurred="onDataErrorOccurred"
    >
      <DxEditing
        mode="row"
        :allow-updating="true"
        :allow-deleting="true"
        :allow-adding="true"
        :use-icons="true"
      />
      <DxRowDragging
        :allow-drop-inside-item="true"
        :show-drag-icons="false"
        :on-drag-change="onDragChange"
        :on-reorder="onReorder"
        :on-drag-move="onDragMove"
      />
      <DxColumn
        data-field="name"
        cell-template="nameCellTemplate"
      />
      <DxColumn
        data-field="size"
        :width="100"
        :customize-text="customizeSizeText"
      />
      <DxColumn
        data-field="dateModified"
        data-type="date"
        :width="150"
      />
      <DxColumn type="buttons">
        <DxButton
          name="add"
          icon="newfolder"
          hint="Create directory"
        />
        <DxButton
          name="edit"
          hint="Rename"
        />
        <DxButton name="delete"/>
        <DxButton
          name="download"
          icon="download"
          hint="Download"
          :visible="isDownloadButtonVisible"
          :on-click="onDownloadButtonClick"
        />
      </DxColumn>
      <template #nameCellTemplate="{ data: options }">
        <div>
          <i :class="`dx-icon-${getIconName(options.data)} item-thumbnail-container`"/>
          <span class="item-name-container">{{ options.data.name }}</span>
        </div>
      </template>
    </DxTreeList>
  </div>
</template>
<style>
.item-thumbnail-container,
.item-name-container {
  padding-left: 5px;
  padding-right: 5px;
  vertical-align: middle;
}

.item-thumbnail-container {
  font-size: 18px;
}

.drag-copy-mode .dx-sortable-dragging.dx-sortable-clone * {
  cursor: copy !important;
}

.directory-row .dx-command-edit .dx-icon-download {
  visibility: hidden;
}

.file-row .dx-command-edit .dx-icon-newfolder {
  visibility: hidden;
}
</style>

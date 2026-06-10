import { useCallback, useMemo, useRef } from 'react';
import type { ComponentProps } from 'react';
import './App.css';
import 'devextreme/dist/css/dx.material.blue.light.compact.css';
import TreeList, {
  Button,
  Column,
  Editing,
  RowDragging,
} from 'devextreme-react/tree-list';
import type { TreeListRef, TreeListTypes } from 'devextreme-react/tree-list';
import CustomStore from 'devextreme/data/custom_store';
import type { LoadOptions } from 'devextreme/data';
import type FileSystemItem from 'devextreme/file_management/file_system_item';
import {
  createFileSystemItem,
  getIconName,
  getParentPath,
  provider,
} from './fileSystem';

type FileItem = FileSystemItem & { parentId?: string };

type RowDraggingProps = ComponentProps<typeof RowDragging>;
type DragChangeEvent = Parameters<NonNullable<RowDraggingProps['onDragChange']>>[0];
type DragMoveEvent = Parameters<NonNullable<RowDraggingProps['onDragMove']>>[0];
type ReorderEvent = Parameters<NonNullable<RowDraggingProps['onReorder']>>[0];

const remoteOperations = { filtering: true };

function isCopyMode(event: unknown): boolean {
  return Boolean((event as { ctrlKey?: boolean } | undefined)?.ctrlKey);
}

function cellRender(options: TreeListTypes.ColumnCellTemplateData): JSX.Element {
  return (
    <div>
      <i className={`dx-icon-${getIconName(options.data)} item-thumbnail-container`} />
      <span className="item-name-container">{options.data.name}</span>
    </div>
  );
}

function customizeSizeText(e: { value?: number | null }): string {
  return e.value !== null && e.value !== undefined ? `${Math.ceil(e.value / 1024)} KB` : '';
}

function parentIdExpr(item: { parentId?: string; path?: string }, value?: string): string {
  if (value) {
    item.parentId = value;
    return value;
  }
  return getParentPath(item.path ?? '');
}

function onEditorPreparing(e: TreeListTypes.EditorPreparingEvent): void {
  if (e.parentType !== 'dataRow') {
    return;
  }

  if (e.dataField !== 'name') {
    e.editorOptions.disabled = true;
  }
}

function onRowPrepared(e: TreeListTypes.RowPreparedEvent): void {
  if (e.isNewRow || e.rowType !== 'data') {
    return;
  }

  const className = e.data.isDirectory ? 'directory-row' : 'file-row';
  e.rowElement.classList.add(className);
}

function onToolbarPreparing(e: TreeListTypes.ToolbarPreparingEvent): void {
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

function onDataErrorOccurred(e: TreeListTypes.DataErrorOccurredEvent): void {
  if (e.error) {
    e.error.message = 'Access denied';
  }
}

function onDragMove(e: DragMoveEvent): void {
  const element = document.body;
  const hasCopyMarker = element.classList.contains('drag-copy-mode');
  const copyMode = isCopyMode(e.event);
  if (copyMode !== hasCopyMarker) {
    element.classList.toggle('drag-copy-mode', copyMode);
  }
}

function isDownloadButtonVisible(e: { row?: TreeListTypes.Row }): boolean {
  return !e.row?.isEditing;
}

function App(): JSX.Element {
  const treeListRef = useRef<TreeListRef>(null);
  const dragCopyModeRef = useRef(false);

  const dataSource = useMemo(() => {
    async function findItemByKey(key: string): Promise<FileSystemItem> {
      const treeList = treeListRef.current?.instance();
      if (!treeList) {
        throw new Error('TreeList is not initialized');
      }
      const item: FileSystemItem = await treeList.byKey(key);
      return createFileSystemItem(key, item.isDirectory);
    }

    return new CustomStore<FileItem, string>({
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
  }, []);

  const onDownloadButtonClick = useCallback(
    (e: { row?: TreeListTypes.Row; event?: { preventDefault: () => void } }) => {
      provider.downloadItems([e.row?.data]);
      e.event?.preventDefault();
    },
    [],
  );

  const onDragChange = useCallback(
    (e: DragChangeEvent) => {
      const treeList = treeListRef.current?.instance();
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

      dragCopyModeRef.current = isCopyMode(e.event);
    },
    [],
  );

  const onReorder = useCallback(
    (e: ReorderEvent) => {
      const treeList = treeListRef.current?.instance();
      if (!treeList || !e.itemData) {
        return;
      }

      const visibleRows = treeList.getVisibleRows();
      const sourceData = e.itemData;
      const targetData = visibleRows[e.toIndex].data;

      const destDirectory = e.dropInsideItem ? targetData : createFileSystemItem('', true);
      const editItemsFunc = dragCopyModeRef.current ? provider.copyItems : provider.moveItems;

      editItemsFunc
        .call(provider, [sourceData], destDirectory)[0]
        .then(() => treeList.refresh());
    },
    [],
  );

  return (
    <div className="main">
      <TreeList
        ref={treeListRef}
        dataSource={dataSource}
        showBorders={true}
        remoteOperations={remoteOperations}
        keyExpr="key"
        parentIdExpr={parentIdExpr}
        hasItemsExpr="isDirectory"
        rootValue=""
        focusedRowEnabled={true}
        height={500}
        onEditorPreparing={onEditorPreparing}
        onRowPrepared={onRowPrepared}
        onToolbarPreparing={onToolbarPreparing}
        onDataErrorOccurred={onDataErrorOccurred}
      >
        <Editing
          mode="row"
          allowUpdating={true}
          allowDeleting={true}
          allowAdding={true}
          useIcons={true}
        />
        <RowDragging
          allowDropInsideItem={true}
          showDragIcons={false}
          onDragChange={onDragChange}
          onReorder={onReorder}
          onDragMove={onDragMove}
        />
        <Column dataField="name" cellRender={cellRender} />
        <Column dataField="size" width={100} customizeText={customizeSizeText} />
        <Column dataField="dateModified" dataType="date" width={150} />
        <Column type="buttons">
          <Button name="add" icon="newfolder" hint="Create directory" />
          <Button name="edit" hint="Rename" />
          <Button name="delete" />
          <Button
            name="download"
            icon="download"
            hint="Download"
            visible={isDownloadButtonVisible}
            onClick={onDownloadButtonClick}
          />
        </Column>
      </TreeList>
    </div>
  );
}

export default App;

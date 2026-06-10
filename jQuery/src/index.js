$(() => {
  const provider = new DevExpress.fileManagement.RemoteFileSystemProvider({
    endpointUrl: 'https://js.devexpress.com/Demos/Mvc/api/file-manager-file-system-scripts',
  });

  let treeList = null;
  let dragCopyMode = false;

  const getParentPath = (path) => {
    if (!path) {
      return '';
    }

    const index = path.lastIndexOf('/');
    return index !== -1 ? path.substr(0, index) : '';
  };

  const getIconName = (item) => {
    if (item.isDirectory) {
      return 'folder';
    }
    switch (item.getFileExtension()) {
      case '.png':
      case '.gif':
      case '.jpg':
      case '.ico':
        return 'image';
      default:
        return 'doc';
    }
  };

  const findItemByKey = (key) => treeList
    .byKey(key)
    .then((item) => new DevExpress.fileManagement.FileSystemItem(key, item.isDirectory));

  const dataSource = {
    key: 'key',
    load(options) {
      const parentIds = options.parentIds || [''];
      const promises = parentIds.map((parentId) => {
        const directory = new DevExpress.fileManagement.FileSystemItem(parentId, true);
        return provider.getItems(directory);
      });

      if (promises.length === 1) {
        return promises[0];
      }

      return Promise.all(promises).then((parts) => [].concat(...parts));
    },
    insert(values) {
      const parentPath = values.parentId || '';
      const directory = new DevExpress.fileManagement.FileSystemItem(parentPath, true);
      return provider.createDirectory(directory, values.name);
    },
    update(key, values) {
      return findItemByKey(key).then((item) => provider.renameItem(item, values.name));
    },
    remove(key) {
      return findItemByKey(key).then((item) => provider.deleteItems([item])[0]);
    },
  };

  treeList = $('#treeList').dxTreeList({
    dataSource,
    showBorders: true,
    remoteOperations: {
      filtering: true,
    },
    keyExpr: 'key',
    parentIdExpr(item, value) {
      if (value) {
        item.parentId = value;
        return value;
      }
      return getParentPath(item.path);
    },
    hasItemsExpr: 'isDirectory',
    rootValue: '',
    focusedRowEnabled: true,
    height: 500,
    editing: {
      mode: 'row',
      allowUpdating: true,
      allowDeleting: true,
      allowAdding: true,
      useIcons: true,
    },
    rowDragging: {
      allowDropInsideItem: true,
      showDragIcons: false,
      onDragChange(e) {
        const visibleRows = treeList.getVisibleRows();
        const sourceNode = treeList.getNodeByKey(e.itemData.key);
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

        dragCopyMode = e.event.ctrlKey;
      },
      onReorder(e) {
        const visibleRows = e.component.getVisibleRows();
        const sourceData = e.itemData;
        const targetData = visibleRows[e.toIndex].data;

        const destDirectory = e.dropInsideItem
          ? targetData
          : new DevExpress.fileManagement.FileSystemItem('', true);
        const editItemsFunc = dragCopyMode ? provider.copyItems : provider.moveItems;

        editItemsFunc
          .call(provider, [sourceData], destDirectory)[0]
          .then(() => treeList.refresh());
      },
      onDragMove(e) {
        const element = document.body;
        const hasCopyMarker = element.classList.contains('drag-copy-mode');
        const copyMode = e.event.ctrlKey;
        if (copyMode !== hasCopyMarker) {
          element.classList.toggle('drag-copy-mode', copyMode);
        }
      },
    },
    columns: [
      {
        dataField: 'name',
        cellTemplate(container, options) {
          $('<i>')
            .addClass(`dx-icon-${getIconName(options.data)} item-thumbnail-container`)
            .appendTo(container);
          $('<span>')
            .addClass('item-name-container')
            .text(options.data.name)
            .appendTo(container);
        },
      },
      {
        dataField: 'size',
        width: 100,
        customizeText: (e) => (e.value !== null ? `${Math.ceil(e.value / 1024)} KB` : ''),
      },
      {
        dataField: 'dateModified',
        dataType: 'date',
        width: 150,
      },
      {
        type: 'buttons',
        buttons: [
          {
            name: 'add',
            icon: 'newfolder',
            hint: 'Create directory',
          },
          {
            name: 'edit',
            hint: 'Rename',
          },
          {
            name: 'delete',
          },
          {
            name: 'download',
            icon: 'download',
            hint: 'Download',
            visible: (e) => !e.row.isEditing,
            onClick(e) {
              provider.downloadItems([e.row.data]);
              e.event.preventDefault();
            },
          },
        ],
      },
    ],
    onEditorPreparing(e) {
      if (e.parentType !== 'dataRow') {
        return;
      }

      if (e.dataField !== 'name') {
        e.editorOptions.disabled = true;
      }
    },
    onRowPrepared(e) {
      if (e.isNewRow || e.rowType !== 'data') {
        return;
      }

      const className = e.data.isDirectory ? 'directory-row' : 'file-row';
      e.rowElement.addClass(className);
    },
    onToolbarPreparing(e) {
      const addRowButton = e.toolbarOptions.items.filter((item) => item.name === 'addRowButton')[0];
      addRowButton.options.icon = 'newfolder';
      addRowButton.options.hint = 'Create directory';
    },
    onDataErrorOccurred(e) {
      e.error.message = 'Access denied';
    },
  }).dxTreeList('instance');
});

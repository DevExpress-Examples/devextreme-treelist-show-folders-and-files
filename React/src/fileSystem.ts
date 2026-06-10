import RemoteFileSystemProvider from 'devextreme/file_management/remote_provider';
import FileSystemItem from 'devextreme/file_management/file_system_item';

export const provider = new RemoteFileSystemProvider({
  endpointUrl: 'https://js.devexpress.com/Demos/Mvc/api/file-manager-file-system-scripts',
});

export function getParentPath(path: string): string {
  if (!path) {
    return '';
  }

  const index = path.lastIndexOf('/');
  return index !== -1 ? path.substr(0, index) : '';
}

export function getIconName(item: FileSystemItem): string {
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
}

export function createFileSystemItem(path: string, isDirectory: boolean): FileSystemItem {
  return new FileSystemItem(path, isDirectory);
}

import { DefaultFileService } from "./DefaultFileServiceImpl";
import { FileService } from "./FileService";
import { Ref } from "./Ref";

export const FileServiceRef = new Ref<FileService>({
    defaultSupplier: () => {
        return new DefaultFileService();
    }
});

export { FileServiceRef as default }
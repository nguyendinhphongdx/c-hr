export { TagBadge } from "./components/TagBadge";
export { TagPicker } from "./components/TagPicker";
export { TagLibraryAdmin } from "./components/TagLibraryAdmin";
export {
  tagKeys,
  useTags,
  useObjectTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useAttachTag,
  useDetachTag,
  useBulkSetTags,
} from "./hooks/useTags";
export { tagService } from "./services/tagService";
export type {
  Tag,
  TagAssignment,
  ListTagsQuery,
  CreateTagInput,
  UpdateTagInput,
  AttachTagInput,
  BulkSetTagsInput,
} from "./types";

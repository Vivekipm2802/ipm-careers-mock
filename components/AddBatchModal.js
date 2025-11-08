import {
  Button,
  Checkbox,
  CheckboxGroup,
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Switch,
  TimeInput,
} from "@nextui-org/react";
import { parseAbsoluteToLocal } from "@internationalized/date";
import ImageUploader from "./ImageUploader";

export default function AddBatchModal({
  isOpen,
  onClose,
  controls,
  newBatchData,
  setNewBatchData,
  addBatch,
  isEditMode = false,
}) {
  const handleCreate = async () => {
    try {
      await addBatch(newBatchData);
      onClose();
    } catch (error) {
      console.error("Error during add/edit operation:", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {isEditMode ? "Edit Batch" : "Create New Batch"}
        </ModalHeader>
        <ModalBody>
          {controls &&
            controls.map((l, t) => {
              if (l.type == "text") {
                return (
                  <Input
                    key={t}
                    size="sm"
                    className="mb-2"
                    label={l.label}
                    placeholder={l.placeholder}
                    value={newBatchData?.[l.key] || ""}
                    onChange={(e) => {
                      setNewBatchData((res) => ({
                        ...res,
                        [l.key]: e.target.value,
                      }));
                    }}
                  ></Input>
                );
              }
              if (l.type == "checkbox") {
                return (
                  <CheckboxGroup
                    key={t}
                    size="sm"
                    className="w-full my-2"
                    label={l.label}
                    placeholder={l.placeholder}
                    value={newBatchData?.[l.key] || []}
                    onValueChange={(e) => {
                      setNewBatchData((res) => ({
                        ...res,
                        [l.key]: e,
                      }));
                    }}
                  >
                    {l.items &&
                      l.items.map((p, a) => {
                        return (
                          <Checkbox key={a} value={p.index}>
                            {p.title}
                          </Checkbox>
                        );
                      })}
                  </CheckboxGroup>
                );
              }
              if (l.type == "time") {
                return (
                  <TimeInput
                    key={t}
                    className="mb-2"
                    size="sm"
                    label={l.label}
                    placeholder={l.placeholder}
                    value={(() => {
                      try {
                        if (newBatchData?.[l.key]) {
                          const timeStr = newBatchData[l.key];
                          const date = new Date(timeStr);
                          return {
                            hour: date.getHours(),
                            minute: date.getMinutes(),
                          };
                        }
                        return null;
                      } catch {
                        return null;
                      }
                    })()}
                    onChange={(e) => {
                      setNewBatchData((res) => ({
                        ...res,
                        [l.key]:
                          typeof e.toAbsoluteString === "function"
                            ? e.toAbsoluteString()
                            : e.toString(),
                      }));
                    }}
                  ></TimeInput>
                );
              }
              if (l.type == "date") {
                return (
                  <DatePicker
                    key={t}
                    granularity="day"
                    className="mb-2"
                    size="sm"
                    label={l.label}
                    placeholder={l.placeholder}
                    value={
                      newBatchData?.[l.key]
                        ? parseAbsoluteToLocal(newBatchData[l.key])
                        : null
                    }
                    onChange={(e) => {
                      const jsDate = e?.toDate?.();
                      const isoString = jsDate ? jsDate.toISOString() : null;
                      setNewBatchData((res) => ({
                        ...res,
                        [l.key]: isoString,
                      }));
                    }}
                  />
                );
              }
              if (l.type == "image") {
                return (
                  <div key={t}>
                    <p>{l.placeholder}</p>
                    <ImageUploader
                      label={l.label}
                      placeholder={l.placeholder}
                      onUploadComplete={(e) => {
                        setNewBatchData((res) => ({
                          ...res,
                          [l.key]: e,
                        }));
                      }}
                    ></ImageUploader>
                  </div>
                );
              }
              if (l.type == "select") {
                return (
                  <Select
                    key={t}
                    size="sm"
                    className="mb-2"
                    label={l.label}
                    placeholder={l.placeholder}
                    selectedKeys={
                      newBatchData?.[l.key]
                        ? [newBatchData[l.key].toString()]
                        : []
                    }
                    onChange={(e) => {
                      setNewBatchData((res) => ({
                        ...res,
                        [l.key]: e.target.value,
                      }));
                    }}
                  >
                    {l.items &&
                      l.items?.map((p, a) => {
                        return (
                          <SelectItem
                            key={
                              p.id ?? p.value ?? p?.title?.toLocaleLowerCase()
                            }
                          >
                            {p.title ?? p?.display_name ?? p?.userEmail}
                          </SelectItem>
                        );
                      })}
                  </Select>
                );
              }
              if (l.type == "switch") {
                return (
                  <Switch
                    key={t}
                    granularity="minute"
                    isSelected={newBatchData && newBatchData[l.key]}
                    className="mb-2"
                    size="sm"
                    onValueChange={(e) => {
                      setNewBatchData((res) => ({
                        ...res,
                        [l.key]: e,
                      }));
                    }}
                  >
                    {l.label}
                  </Switch>
                );
              }
            })}
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleCreate}>
            {isEditMode ? "Update Batch" : "Create Batch"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

import TextField from './TextField.vue';
import NumberField from './NumberField.vue';
import SelectField from './SelectField.vue';
import RadioField from './RadioField.vue';
import CheckboxField from './CheckboxField.vue';
import DateField from './DateField.vue';
import TimeField from './TimeField.vue';
import TextareaField from './TextareaField.vue';
import FileUploadField from './FileUploadField.vue';
import ImageUploadField from './ImageUploadField.vue';
import SignatureField from './SignatureField.vue';
import SwitchField from './SwitchField.vue';
import CascaderField from './CascaderField.vue';
import RateField from './RateField.vue';
import SliderField from './SliderField.vue';
import ColorField from './ColorField.vue';
import PasswordField from './PasswordField.vue';
import DateRangeField from './DateRangeField.vue';
import TimeRangeField from './TimeRangeField.vue';
import RichTextField from './RichTextField.vue';

export {
  TextField,
  NumberField,
  SelectField,
  RadioField,
  CheckboxField,
  DateField,
  TimeField,
  TextareaField,
  FileUploadField,
  ImageUploadField,
  SignatureField,
  SwitchField,
  CascaderField,
  RateField,
  SliderField,
  ColorField,
  PasswordField,
  DateRangeField,
  TimeRangeField,
  RichTextField,
};

export type { FieldConfig } from './TextField.vue';

/**
 * 获取字段组件
 * @param type 字段类型
 * @returns 对应的字段组件，如果没有则返回 null
 */
export function getFieldComponent(type: string) {
  const componentMap: Record<string, any> = {
    text: TextField,
    textarea: TextareaField,
    number: NumberField,
    select: SelectField,
    radio: RadioField,
    checkbox: CheckboxField,
    date: DateField,
    time: TimeField,
    file: FileUploadField,
    image: ImageUploadField,
    signature: SignatureField,
    switch: SwitchField,
    cascader: CascaderField,
    rate: RateField,
    slider: SliderField,
    color: ColorField,
    password: PasswordField,
    daterange: DateRangeField,
    timerange: TimeRangeField,
    richtext: RichTextField,
  };

  return componentMap[type] || null;
}

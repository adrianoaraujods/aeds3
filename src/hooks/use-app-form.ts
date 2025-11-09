import { createFormHook, createFormHookContexts } from "@tanstack/react-form";

import { DateField } from "@/components/form/date-field";
import { DocumentNumberField } from "@/components/form/document-field";
import { NumberField } from "@/components/form/number-field";
import { PhoneField } from "@/components/form/phone-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";

const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    SelectField,
    DocumentNumberField,
    PhoneField,
    DateField,
    NumberField,
  },
  formComponents: {},
});

export { fieldContext, formContext, useFieldContext, useAppForm };

import { createFormHook, createFormHookContexts } from "@tanstack/react-form";

import {
  DocumentNumberField,
  PhoneField,
  SelectField,
  TextField,
} from "@/components/layout/form";

const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    SelectField,
    DocumentNumberField,
    PhoneField,
  },
  formComponents: {},
});

export { fieldContext, formContext, useFieldContext, useAppForm };

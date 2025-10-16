"use client";

import * as React from "react";

import { toast } from "sonner";

import { useData } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { getDrawing } from "@/actions/drawing";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import type { Drawing } from "@/lib/schemas";

export const DEAFULT_DRAWING: Drawing = { id: 0, number: "" };

export function DrawingSelect({
  drawing,
  setDrawing,
}: {
  drawing: Drawing;
  setDrawing: React.Dispatch<React.SetStateAction<Drawing>>;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const {
    data: { drawings },
  } = useData();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-[200px] justify-between"
        >
          {drawing.id === 0 ? "Novo desenho" : drawing.number}

          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Pesquisar desenho..." className="h-9" />

          <CommandList>
            <CommandEmpty>Nenhum desenho encontrado.</CommandEmpty>

            <CommandGroup>
              <CommandItem
                value={"0"}
                onSelect={() => {
                  setDrawing(DEAFULT_DRAWING);
                  setIsOpen(false);
                }}
              >
                <Text size="sm">Novo desenho</Text>

                <CheckIcon
                  className={cn(
                    "ml-auto",
                    drawing.id === 0 ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>

              {drawings.map(({ id, number }) => (
                <CommandItem
                  key={id}
                  value={String(id)}
                  onSelect={async () => {
                    const res = await getDrawing(id);

                    if (!res.ok) {
                      toast.error("Houve algum erro ao carregar o desenho.");
                      return;
                    }

                    setDrawing(res.data);
                    setIsOpen(false);
                  }}
                >
                  <Text>{number}</Text>

                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      id === drawing.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

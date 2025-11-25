"use client";

import * as React from "react";

import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { getAllDrawings } from "@/actions/drawing";
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
import { DEAFULT_DRAWING } from "@/schemas/drawing";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import type { DrawingData } from "@/schemas/drawing";

export function DrawingSelect({
  drawing,
  setDrawing,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  drawing: DrawingData;
  setDrawing: (client: DrawingData) => void;
}) {
  const [drawings, setDrawings] = React.useState<DrawingData[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    getAllDrawings().then((res) => {
      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      setDrawings(res.data);
    });
  }, []);

  async function handleSelect(drawingNumber: DrawingData["number"]) {
    const drawing: DrawingData = drawings.find(
      ({ number }) => number === drawingNumber
    )!;

    setDrawing(drawing);
    setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("w-[200px] justify-between", className)}
          {...props}
        >
          {drawing.isNew ? "Novo desenho" : drawing.number}

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
                value="Novo desenho"
                onSelect={() => {
                  setDrawing(DEAFULT_DRAWING);
                  setIsOpen(false);
                }}
              >
                <Text size="sm">Novo desenho</Text>

                <CheckIcon
                  className={cn(
                    "ml-auto",
                    drawing.isNew ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>

              {drawings.map(({ number }) => (
                <CommandItem
                  key={number}
                  value={number}
                  onSelect={() => handleSelect(number)}
                >
                  <Text>{number}</Text>

                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      drawing.number ? "opacity-100" : "opacity-0"
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

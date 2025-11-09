"use client";

import * as React from "react";

import { toast } from "sonner";

import { useData } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { getClient } from "@/actions/client";
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

export function ClientSelect({
  clientId,
  setClientId,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  clientId: number;
  setClientId: (clientId: number) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const {
    data: { clients },
  } = useData();

  const [clientName, setClientName] = React.useState<string>();

  React.useEffect(() => {
    const client = clients.find(({ id }) => id === clientId);

    setClientName(!client ? undefined : client.name);
  }, [clientId, clients]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("w-[200px] justify-between", className)}
          {...props}
        >
          {clientName || "Selecione..."}

          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Pesquisar cliente..." className="h-9" />

          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>

            <CommandGroup>
              {clients.map(({ id, name }) => (
                <CommandItem
                  key={id}
                  value={String(id)}
                  onSelect={async () => {
                    const res = await getClient(id);

                    if (!res.ok) {
                      toast.error("Houve algum erro ao carregar o cliente.");
                      return;
                    }

                    setClientName(name);
                    setClientId(id);
                    setIsOpen(false);
                  }}
                >
                  <Text>{name}</Text>

                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      id === clientId ? "opacity-100" : "opacity-0"
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

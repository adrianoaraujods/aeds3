"use client";

import * as React from "react";

import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { getAllClients } from "@/actions/client";
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

import type { ClientData } from "@/schemas/client";

export function ClientSelect({
  client,
  setClient,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  client: ClientData;
  setClient: (client: ClientData) => void;
}) {
  const [clients, setClients] = React.useState<ClientData[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    getAllClients().then((res) => {
      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      setClients(res.data);
    });
  }, []);

  async function handleSelect(clientId: ClientData["id"]) {
    const client: ClientData = clients.find(({ id }) => id === clientId)!;

    setClient(client);
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
          {client.name.length === 0 ? "Selecione..." : client.name}

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
                  onSelect={() => handleSelect(id)}
                >
                  <Text>{name}</Text>

                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      id === client.id ? "opacity-100" : "opacity-0"
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

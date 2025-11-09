"use client";

import * as React from "react";

import { toast } from "sonner";

import { useData } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { getProductData } from "@/actions/product";
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
import { ProductData } from "@/schemas/product";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

export function ProductSelect({
  product,
  setProduct,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  product: Omit<ProductData, "drawings">;
  setProduct: (product: ProductData) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const {
    data: { products },
  } = useData();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("w-[200px] justify-between", className)}
          {...props}
        >
          {product.code === "" ? "Selecione..." : product.code}

          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Pesquisar produto..." className="h-9" />

          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>

            <CommandGroup>
              {products.map(({ id, code, description }) => (
                <CommandItem
                  key={id}
                  value={`${code} ${description}`}
                  onSelect={async () => {
                    const res = await getProductData(id);

                    if (!res.ok) {
                      toast.error("Houve algum erro ao carregar o produto.");
                      return;
                    }

                    setProduct(res.data);
                    setIsOpen(false);
                  }}
                >
                  <Text>
                    {code} | {description}
                  </Text>

                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      id === product.id ? "opacity-100" : "opacity-0"
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

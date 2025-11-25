"use client";

import * as React from "react";

import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { getAllProducts } from "@/actions/product";
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

import type { ProductData } from "@/schemas/product";

export function ProductSelect({
  product,
  setProduct,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  product: Omit<ProductData, "drawings">;
  setProduct: (product: ProductData) => void;
}) {
  const [products, setProducts] = React.useState<ProductData[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    getAllProducts().then((res) => {
      if (!res.ok) {
        toast.error(res.message);
      }

      setProducts(res.data);
    });
  }, []);

  async function handleSelect(productId: ProductData["id"]) {
    const client: ProductData = products.find(({ id }) => id === productId)!;

    setProduct(client);
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
                  onSelect={() => handleSelect(id)}
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

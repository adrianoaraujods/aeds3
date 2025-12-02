"use client";

import * as React from "react";
import Link from "next/link";

import { toast } from "sonner";

import { getAllProducts } from "@/actions/product";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ProductData } from "@/schemas/product";

import { SearchIcon } from "lucide-react";

import { useSidebar } from "../ui/sidebar";

export function ProductSearch() {
  const { open: sidebarIsOpen } = useSidebar();

  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  const [products, setProducts] = React.useState<ProductData[]>([]);

  const [results, setResults] = React.useState<ProductData[]>(products);
  const [isKMP, setIsKMP] = React.useState(false);

  // load initial products
  React.useEffect(() => {
    getAllProducts().then((res) => {
      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      setProducts(res.data);
      setResults(res.data);
    });
  }, []);

  // update results
  React.useEffect(() => {
    if (isKMP) {
    } else {
    }
  }, [value, isKMP, setResults]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={sidebarIsOpen ? "default" : "icon"}
          className="text-muted-foreground w-full"
          aria-expanded={open}
        >
          <Text className="mr-auto" hidden={!sidebarIsOpen}>
            Pesquisar Produto...
          </Text>

          <SearchIcon />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        className="w-60 overflow-hidden p-0"
      >
        <Input
          className="rounded-none border-0 focus-visible:ring-0"
          placeholder="Digite o código..."
          onChange={({ target }) => setValue(target.value)}
          value={value}
        />

        <div className="flex gap-2 p-2">
          <Label htmlFor="algorithm">Boyer-Moore</Label>

          <Switch
            id="algorithm"
            checked={isKMP}
            onCheckedChange={(checked) => setIsKMP(checked)}
          />

          <Label htmlFor="algorithm">KMP</Label>
        </div>

        <div className="flex flex-col">
          {results.length === 0 ? (
            <Text className="py-2 text-center" size="sm">
              Nenhum resultado encontrado!
            </Text>
          ) : (
            results.map((product) => (
              <Button
                variant="ghost"
                className="w-full rounded-none"
                key={product.id}
                asChild
              >
                <Link href={`produtos/${product.id}`} target="_blank">
                  <Text className="mr-auto" size="sm">
                    {product.code}
                  </Text>
                </Link>
              </Button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

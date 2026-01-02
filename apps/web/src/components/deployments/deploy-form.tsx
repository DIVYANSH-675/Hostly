"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { GitBranch, LoaderCircle, ChevronDown } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import EnvVariableForm from "~/components/environment/env-variable";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const formSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(63, "Name must be at most 63 characters")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      "Name can only contain lowercase letters, numbers, and dashes (cannot start or end with dash)"
    ),
  repository: z.string(),
  branch: z.string().min(1, "Branch is required"),
});

interface DeployFormProps {
  repoDetails: {
    full_name: string;
    default_branch: string;
    name: string;
    branches?: string[];
  };
}

export default function DeployForm({ repoDetails }: DeployFormProps) {
  const [environmentVariables, setEnvironmentVariables] = useState([
    { key: "", value: "" },
  ]);

  const branches = repoDetails.branches || [repoDetails.default_branch];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: repoDetails.name,
      repository: repoDetails.full_name,
      branch: repoDetails.default_branch,
    },
  });

  const router = useRouter();

  const mutation = api.sites.create.useMutation({
    async onSuccess(data) {
      router.push(`/site?id=${data.id}`);
    },
    async onError(err) {
      toast(`Error - ${JSON.stringify(err)}`);
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    mutation.mutate({
      ...values,
      environmentVariables,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-2xl backdrop-blur-sm">
          <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 -m-6 mb-6 p-6 md:-m-8 md:mb-8 md:p-8 border-b border-white/5">
            <h2 className="mb-2 text-2xl font-bold tracking-tight">
              Deploy {repoDetails.name}
            </h2>
            <div className="flex items-center gap-4 mt-4">
              <a
                href={`https://github.com/${repoDetails.full_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-foreground bg-black/20 px-3 py-1.5 rounded-full border border-white/5 hover:bg-black/30 transition-colors"
              >
                <SiGithub className="h-4 w-4" />
                <span>{repoDetails.full_name}</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <div className="w-1 h-6 bg-violet-500 rounded-full"></div>
              Project Settings
            </h3>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="my-awesome-project" {...field} className="bg-black/20 border-white/10 focus:border-violet-500/50 h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Branch Selection */}
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      Branch to Deploy
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-black/20 border-white/10 focus:border-violet-500/50 h-11">
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {branches.map((branch) => (
                          <SelectItem key={branch} value={branch} className="hover:bg-white/10">
                            {branch}
                            {branch === repoDetails.default_branch && (
                              <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <EnvVariableForm
                  initialEnvVars={environmentVariables}
                  onEnvVarsChange={setEnvironmentVariables}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-white/5">
            <Button type="button" variant="ghost" asChild className="hover:bg-white/5">
              <Link href="/">Cancel</Link>
            </Button>
            <Button type="submit" size="lg" className="px-8 bg-foreground text-background hover:bg-foreground/90 font-semibold" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
                  Deploying...
                </>
              ) : (
                "Deploy"
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}


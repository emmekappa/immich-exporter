import { z } from "zod";

export const ConfigurationOptionsSchema = z.object({
  IMMICH_HOST: z.string(),
  IMMICH_KEY: z.string(),
  POLL_FREQUENCY: z.coerce.number().default(15), // in seconds
  PORT: z.coerce.number().default(3000), // server port
});

export type ConfigurationOptionsSchemaType = z.infer<
  typeof ConfigurationOptionsSchema
>;

export type ConfigurationOptions = keyof ConfigurationOptionsSchemaType;

export const getConfigOption = <T extends ConfigurationOptions>(
  option: T
): ConfigurationOptionsSchemaType[T] => {
  const schema = ConfigurationOptionsSchema.shape[option];

  return schema.parse(process.env[option], {
    path: ["config", option],
  }) as ConfigurationOptionsSchemaType[T];
};

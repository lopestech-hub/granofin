import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { env } from '../config/env'

declare module 'fastify' {
  interface FastifyInstance {
    r2: {
      client: S3Client
      uploadComprovante: (key: string, buffer: Buffer, contentType: string) => Promise<string>
      deletarComprovante: (key: string) => Promise<void>
    }
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })

  const uploadComprovante = async (key: string, buffer: Buffer, contentType: string): Promise<string> => {
    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    )
    return `${env.R2_PUBLIC_URL}/${key}`
  }

  const deletarComprovante = async (key: string): Promise<void> => {
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
      })
    )
  }

  app.decorate('r2', { client, uploadComprovante, deletarComprovante })
}

export const r2Plugin = fp(plugin)

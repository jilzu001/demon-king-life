import Ajv2020 from 'ajv/dist/2020';
import storySchema from '../../schemas/story.schema.json';
import chapterSchema from '../../schemas/chapter.schema.json';
import characterSchema from '../../schemas/characters.schema.json';
import endingSchema from '../../schemas/endings.schema.json';
import saveSchema from '../../schemas/save.schema.json';
import metaSchema from '../../schemas/meta.schema.json';
import presentationSchema from '../../schemas/presentation.schema.json';
import { ensure } from '../engine/types';

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const validators = {
  story: ajv.compile(storySchema), chapter: ajv.compile(chapterSchema),
  characters: ajv.compile(characterSchema), endings: ajv.compile(endingSchema),
  save: ajv.compile(saveSchema), meta: ajv.compile(metaSchema),
  presentation: ajv.compile(presentationSchema),
};
export function validateSchema(kind: keyof typeof validators, data: unknown): void {
  const validator = validators[kind];
  ensure(validator(data), `${kind}: 스키마 오류 ${ajv.errorsText(validator.errors, { separator: '; ' })}`);
}

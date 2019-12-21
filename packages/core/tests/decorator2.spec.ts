import 'jest-extended'
import 'reflect-metadata';
import {getClassSchema, isOptional, plainToClass, PropertySchema, f} from "..";
import {Buffer} from "buffer";

test('test optional', () => {
    class Model {
        @f.optional() super?: number
    }

    const schema = getClassSchema(Model);
    const prop = schema.getProperty('super');

    expect(prop.isOptional).toBe(true);
    expect(prop.type).toBe('number');
});

test('test @Field', () => {
    class Config {
        @f created: Date = new Date;
    }

    class Page {
        @f.map(Config)
        map: { [name: string]: Config } = {};

        @f.array(Config)
        configArray: Config[] = [];

        constructor(
            @f name: string,
            @f.array(String) tags: string[]
        ) {
        }
    }

    const schema = getClassSchema(Page);

    expect(schema.getProperty('name').isMap).toBe(false);
    expect(schema.getProperty('name').isArray).toBe(false);
    expect(schema.getProperty('name').type).toBe('string');

    expect(schema.getProperty('tags').isMap).toBe(false);
    expect(schema.getProperty('tags').isArray).toBe(true);
    expect(schema.getProperty('tags').type).toBe('string');

    expect(schema.getProperty('map').type).toBe('class');
    expect(schema.getProperty('map').isMap).toBe(true);
    expect(schema.getProperty('map').getResolvedClassType()).toBe(Config);
    expect(schema.getProperty('map').isArray).toBe(false);

    expect(schema.getProperty('configArray').type).toBe('class');
    expect(schema.getProperty('configArray').isArray).toBe(true);
    expect(schema.getProperty('configArray').getResolvedClassType()).toBe(Config);
    expect(schema.getProperty('configArray').isMap).toBe(false);
});


test('test binary', () => {
    class User {
        @f.type(Buffer) picture?: Buffer
    }

    const schema = getClassSchema(User);
    expect(schema.getProperty('picture').type).toBe('binary');
});

test('test asName', () => {
    class User {
        constructor(
            @f.asName('fieldA')
            public parent: string,
            @f.uuid().optional().asName('fieldB')
            public neighbor?: string,
        ) {
        }
    }

    const user = plainToClass(User, {
        fieldA: 'a',
        fieldB: 'b'
    });

    const schema = getClassSchema(User);
    expect(schema.getProperty('fieldA')).toBeInstanceOf(PropertySchema);
    expect(schema.getProperty('fieldB')).toBeInstanceOf(PropertySchema);

    expect(user.parent).toBe('a');
    expect(user.neighbor).toBe('b');
    expect(isOptional(User, 'fieldB')).toBe(true);
});

test('test asName easy', () => {
    class User {
        constructor(
            @f public parent: string,
            @f public neighbor?: number,
        ) {
        }
    }

    const schema = getClassSchema(User);
    expect(schema.getProperty('parent').type).toBe('string');
    expect(schema.getProperty('neighbor').type).toBe('number');
});

test('test inheritance', async () => {
    class Base {
        constructor(
            @f.index({}, 'id2')
            public id: string,
        ) {
        }
    }

    class Page extends Base {
        constructor(id: string, @f public name: string) {
            super(id);
        }
    }

    class Between extends Page {

    }

    class SuperPage extends Between {
        @f.optional() super?: number;
    }

    class Super2 extends SuperPage {
    }

    class Super3 extends Super2 {
    }

    expect(getClassSchema(Base).getProperty('id').type).toBe('string');
    expect(getClassSchema(Base).getIndex('id2')!.name).toBe('id2');

    expect(getClassSchema(Page).getProperty('id').type).toBe('string');
    expect(getClassSchema(Page).getProperty('name').type).toBe('string');
    expect(getClassSchema(Page).getIndex('id2')!.name).toBe('id2');

    expect(getClassSchema(SuperPage).getProperty('id').type).toBe('string');
    expect(getClassSchema(SuperPage).getProperty('name').type).toBe('string');
    expect(getClassSchema(SuperPage).getProperty('super').type).toBe('number');
    expect(getClassSchema(SuperPage).getIndex('id2')!.name).toBe('id2');

    expect(getClassSchema(Super3).getProperty('id').type).toBe('string');
    expect(getClassSchema(Super3).getProperty('name').type).toBe('string');
    expect(getClassSchema(Super3).getProperty('super').type).toBe('number');
    expect(getClassSchema(Super3).getIndex('id2')!.name).toBe('id2');

    expect(getClassSchema(Super2).getProperty('id').type).toBe('string');
    expect(getClassSchema(Super2).getProperty('name').type).toBe('string');
    expect(getClassSchema(Super2).getProperty('super').type).toBe('number');
    expect(getClassSchema(Super2).getIndex('id2')!.name).toBe('id2');
});



test('test invalid @Field', () => {
    class Config {
        @f.optional() name?: string;
    }

    expect(() => {
        class User1 {
            @f
            notDefined;
        }
    }).toThrowError('User1::notDefined type mismatch. Given undefined, but declared is Object or undefined.');

    expect(() => {
        var NOTEXIST;

        class User2 {
            @f.type(NOTEXIST)
            notDefined;
        }
    }).toThrowError('User2::notDefined type mismatch. Given undefined, but declared is Object or undefined.');

    expect(() => {
        class User3 {
            @f
            created = new Date;
        }
    }).toThrowError('User3::created type mismatch. Given undefined, but declared is Object or undefined.');

    expect(() => {
        class User4 {
            @f.type(Config)
            config: Config[] = [];
        }
    }).toThrowError('User4::config type mismatch. Given Config, but declared is Array.');

    expect(() => {
        class User5 {
            @f.array(Config)
            config?: Config;
        }
    }).toThrowError('User5::config type mismatch. Given Config[], but declared is Config.');

    expect(() => {
        class User6 {
            @f.type(Config)
            config: { [k: string]: Config } = {};
        }
    }).toThrowError('User6::config type mismatch. Given Config, but declared is Object or undefined');

    expect(() => {
        class Model {
            @f.forwardArray(() => Config)
            sub?: Config;
        }

    }).toThrowError('Model::sub type mismatch. Given ForwardedRef[], but declared is Config.');

    expect(() => {
        class Model {
            @f.forwardMap(() => Config)
            sub?: Config;
        }
    }).toThrowError('Model::sub type mismatch. Given {[key: string]: ForwardedRef}, but declared is Config.');

    expect(() => {
        class Model {
            @f.map(Config)
            sub?: Config[];
        }

    }).toThrowError('Model::sub type mismatch. Given {[key: string]: Config}, but declared is Array.');

    expect(() => {
        class Model {
            @f.any()
            any?: any[];
        }
    }).toThrowError('Model::any type mismatch. Given Any, but declared is Array.');

    {
        //works
        class Model {
            @f.any()
            any?: { [k: string]: any };
        }
    }
    {
        //works
        class Model {
            @f.any().asMap()
            any?;
        }
    }

    {
        //works
        class Model {
            @f.forward(() => Config)
            sub?: Config;
        }
    }
});
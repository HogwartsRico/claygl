define(function(require){

    var Node = require('./Node');
    var Light = require('./Light');
    var glMatrix = require("glmatrix");
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    var Scene = Node.derive(function(){
        return {

            scene : null,
            // Global material of scene
            material : null,

            lights : {},
            // Properties to save the light information in the scene
            // Will be set in the render function
            lightNumber : {
                'POINT_LIGHT' : 0,
                'DIRECTIONAL_LIGHT' : 0,
                'SPOT_LIGHT' : 0,
                'AMBIENT_LIGHT' : 0
            },
            lightUniforms : {},

            opaqueQueue : [],
            transparentQueue : [],
            lights : [],

            autoUpdate : true,

            _nodeRepository : {}
        }
    }, function() {
        this.scene = this;
    }, {

        addToScene : function(node) {
            if (node.name) {
                this._nodeRepository[node.name] = node;
            }
        },

        removeFromScene : function(node) {
            if (node.name) {
                this._nodeRepository[node.name] = null;
            }
        },

        getNode : function(name) {
            return this._nodeRepository[name];
        },

        update : function(force) {
            if (!(this.autoUpdate || force)) {
                return;
            }
            Node.prototype.update.call(this, force);

            var lights = this.lights;
            var opaqueQueue = this.opaqueQueue;
            var transparentQueue = this.transparentQueue;
            var sceneMaterialTransparent = this.material && this.material.transparent;
            transparentQueue.length = 0;
            opaqueQueue.length = 0;
            lights.length = 0;

            this._updateRenderQueue(this, sceneMaterialTransparent);

            // reset
            for (type in this.lightNumber) {
                this.lightNumber[type] = 0;
            }
            for (var i = 0; i < lights.length; i++) {
                var light = lights[i];
                this.lightNumber[light.type]++;
            }
            this._updateLightUnforms();
        },

        // Traverse the scene and add the renderable
        // object to the render queue;
        _updateRenderQueue : function(parent, sceneMaterialTransparent) {
            for (var i = 0; i < parent._children.length; i++) {
                var child = parent._children[i];
                if (!child.visible) {
                    continue;
                }
                if (child instanceof Light) {
                    this.lights.push(child);
                }
                // A node have render method and material property
                // is treat as a renderable object
                if (child.render && child.geometry && child.material && child.material.shader ) {
                    if (child.material.transparent || sceneMaterialTransparent) {
                        this.transparentQueue.push(child);
                    } else {
                        this.opaqueQueue.push(child);
                    }
                }
                if (child._children.length > 0) {
                    this._updateRenderQueue(child);
                }
            }
        },

        _updateLightUnforms : function() {
            var lights = this.lights;

            var lightUniforms = this.lightUniforms;
            for (var symbol in lightUniforms) {
                lightUniforms[symbol].value.length = 0;
            }
            for (var i = 0; i < lights.length; i++) {
                
                var light = lights[i];
                
                for (symbol in light.uniformTemplates) {

                    var uniformTpl = light.uniformTemplates[symbol];
                    if (! lightUniforms[symbol]) {
                        lightUniforms[symbol] = {
                            type : "",
                            value : []
                        }
                    }
                    var value = uniformTpl.value(light);
                    var lu = lightUniforms[symbol];
                    lu.type = uniformTpl.type + "v";
                    switch (uniformTpl.type) {
                        case "1i":
                        case "1f":
                            lu.value.push(value);
                            break;
                        case "2f":
                        case "3f":
                        case "4f":
                            for (var j =0; j < value.length; j++) {
                                lu.value.push(value[j]);
                            }
                            break;
                        default:
                            console.error("Unkown light uniform type "+uniformTpl.type);
                    }
                }
            }
        },
        dispose : function() {
            this.lights = [];
            this.lightNumber = {};
            this.lightUniforms = {};
            this.material = {};
            this.opaqueQueue = [];
            this.transparentQueue = [];

            this._nodeRepository = {};
        }
    });

    return Scene;
})
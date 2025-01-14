import React, {useState} from "react";

// Plan: have one element that solely consists of background. Each station and track segment will be its own element, coordinates/line shape stored in the backend.

function DemoMap({hoverCallback, clickCallback}){
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="17.808 175 475.005 8" width="475.005px" height="8px">
      <path style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} d="M 17.808 179.452 L 492.813 179.452" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="22" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="42" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="62" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="82" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="102" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="122" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="142" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="162" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="182" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="202" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="222" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="242" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="262" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="282" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="302" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="322" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="342" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="362" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="382" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="402" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="422" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="442" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="462" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
      <ellipse style={{fill: "rgb(216, 216, 216)", stroke: "stroke: rgb(0, 0, 0)"}} cx="482" cy="179" rx="4" ry="4" transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
    </svg>
  )
}

export {DemoMap};
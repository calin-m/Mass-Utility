<?php
/**
 * PHPStan Bootstrap Stubs File
 * Defines stubs for PrestaShop native classes to prevent analysis crashes.
 */

if (!class_exists('Db')) {
    class Db {
        public static function getInstance(): self
        {
            return new self();
        }
        /**
         * @param string $sql
         * @return array<mixed>|false
         */
        public function executeS(string $sql)
        {
            return [];
        }
        /**
         * @param string $sql
         * @return string
         */
        public function getValue(string $sql): string
        {
            return '8.0';
        }
        /**
         * @param string $sql
         * @return bool
         */
        public function execute(string $sql): bool
        {
            return true;
        }
    }
}
